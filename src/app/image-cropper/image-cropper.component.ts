import {
  Component,
  ViewChild,
  ElementRef,
  AfterViewInit,
  HostListener,
  OnDestroy,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-image-cropper',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './image-cropper.component.html',
  styleUrl: './image-cropper.component.scss',
})
export class ImageCropperComponent implements AfterViewInit, OnDestroy {
  @ViewChild('canvas') canvasRef!: ElementRef<HTMLCanvasElement>;
  private ctx!: CanvasRenderingContext2D;
  private image: HTMLImageElement = new Image();
  private isDragging = false;
  private startX = 0;
  private startY = 0;
  private imageX = 0;
  private imageY = 0;
  scale = 1;
  sliderValue = 0;
  isImageLoaded = false;

  private readonly CANVAS_WIDTH = 400;
  private readonly CANVAS_HEIGHT = 400;
  private initialScale = 1;
  readonly MAX_ZOOM = 3;
  private readonly ZOOM_SPEED = 0.1;

  ngAfterViewInit() {
    const canvas = this.canvasRef.nativeElement;
    canvas.width = this.CANVAS_WIDTH;
    canvas.height = this.CANVAS_HEIGHT;
    const context = canvas.getContext('2d');
    if (!context) {
      this.handleError('Canvasのコンテキストを取得できませんでした。');
      return;
    }
    this.ctx = context;
    this.setupEventListeners();
  }

  ngOnDestroy() {
    this.removeEventListeners();
  }

  private handleError(message: string) {
    console.error(message);
    alert(message);
  }

  private removeEventListeners() {
    const canvas = this.canvasRef.nativeElement;
    canvas.removeEventListener('mousedown', this.startDragging);
    canvas.removeEventListener('mousemove', this.drag);
    canvas.removeEventListener('mouseup', this.stopDragging);
    canvas.removeEventListener('mouseleave', this.stopDragging);
    canvas.removeEventListener('wheel', this.zoom);
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) {
      this.handleError('ファイルが選択されていません。');
      return;
    }

    if (!['image/jpeg', 'image/png'].includes(file.type)) {
      this.handleError(
        'JPG, JPEG, またはPNG形式の画像ファイルを選択してください。'
      );
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      this.image.onload = () => {
        this.resetImagePosition();
        this.drawImage();
        this.isImageLoaded = true;
      };
      this.image.onerror = () => {
        this.handleError('画像の読み込みに失敗しました。');
      };
      this.image.src = e.target?.result as string;
    };
    reader.onerror = () => {
      this.handleError('ファイルの読み込みに失敗しました。');
    };
    reader.readAsDataURL(file);
  }

  private resetImagePosition() {
    this.fitImageToCanvas();
    this.initialScale = this.scale;
    this.sliderValue = 0;
  }

  private fitImageToCanvas() {
    const canvasAspect = this.CANVAS_WIDTH / this.CANVAS_HEIGHT;
    const imageAspect = this.image.width / this.image.height;

    if (imageAspect > canvasAspect) {
      this.scale = this.CANVAS_HEIGHT / this.image.height;
      this.imageY = 0;
      this.imageX = (this.CANVAS_WIDTH - this.image.width * this.scale) / 2;
    } else {
      this.scale = this.CANVAS_WIDTH / this.image.width;
      this.imageX = 0;
      this.imageY = (this.CANVAS_HEIGHT - this.image.height * this.scale) / 2;
    }
  }

  private drawImage() {
    const canvas = this.canvasRef.nativeElement;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.ctx.drawImage(
      this.image,
      this.imageX,
      this.imageY,
      this.image.width * this.scale,
      this.image.height * this.scale
    );
  }

  private setupEventListeners() {
    const canvas = this.canvasRef.nativeElement;
    canvas.addEventListener('mousedown', this.startDragging.bind(this));
    canvas.addEventListener('mousemove', this.drag.bind(this));
    canvas.addEventListener('mouseup', this.stopDragging.bind(this));
    canvas.addEventListener('mouseleave', this.stopDragging.bind(this));
    canvas.addEventListener('wheel', this.zoom.bind(this));
  }

  private startDragging(e: MouseEvent) {
    this.isDragging = true;
    this.startX = e.clientX - this.imageX;
    this.startY = e.clientY - this.imageY;
  }

  private drag(e: MouseEvent) {
    if (!this.isDragging) return;
    let newX = e.clientX - this.startX;
    let newY = e.clientY - this.startY;
    [newX, newY] = this.constrainPosition(newX, newY);
    this.imageX = newX;
    this.imageY = newY;
    this.drawImage();
  }

  private constrainPosition(x: number, y: number): [number, number] {
    const scaledWidth = this.image.width * this.scale;
    const scaledHeight = this.image.height * this.scale;
    x = Math.min(0, Math.max(x, this.CANVAS_WIDTH - scaledWidth));
    y = Math.min(0, Math.max(y, this.CANVAS_HEIGHT - scaledHeight));
    return [x, y];
  }

  private stopDragging() {
    this.isDragging = false;
  }

  @HostListener('wheel', ['$event'])
  private zoom(event: WheelEvent) {
    event.preventDefault();
    const rect = this.canvasRef.nativeElement.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const zoomFactor =
      event.deltaY > 0 ? 1 - this.ZOOM_SPEED : 1 + this.ZOOM_SPEED;
    this.zoomTowardsPoint(mouseX, mouseY, zoomFactor);
  }

  onSliderChange(event: Event) {
    const value = +(event.target as HTMLInputElement).value;
    const zoomFactor =
      this.sliderValueToZoom(value) / (this.scale / this.initialScale);
    this.zoomTowardsCenter(zoomFactor);
  }

  private zoomTowardsPoint(x: number, y: number, zoomFactor: number) {
    const newScale = this.scale * zoomFactor;

    if (newScale < this.initialScale) {
      zoomFactor = this.initialScale / this.scale;
    } else if (newScale > this.initialScale * this.MAX_ZOOM) {
      zoomFactor = (this.initialScale * this.MAX_ZOOM) / this.scale;
    }

    const mouseXCanvas = x - this.imageX;
    const mouseYCanvas = y - this.imageY;

    this.scale *= zoomFactor;

    this.imageX = x - mouseXCanvas * zoomFactor;
    this.imageY = y - mouseYCanvas * zoomFactor;

    [this.imageX, this.imageY] = this.constrainPosition(
      this.imageX,
      this.imageY
    );

    this.drawImage();
    this.updateSliderValue();
  }

  private zoomTowardsCenter(zoomFactor: number) {
    const centerX = this.CANVAS_WIDTH / 2;
    const centerY = this.CANVAS_HEIGHT / 2;
    this.zoomTowardsPoint(centerX, centerY, zoomFactor);
  }

  private updateSliderValue() {
    const zoomFactor = this.scale / this.initialScale;
    this.sliderValue = this.zoomToSliderValue(zoomFactor);
  }

  private sliderValueToZoom(value: number): number {
    return 1 + (value / 100) * (this.MAX_ZOOM - 1);
  }

  private zoomToSliderValue(zoom: number): number {
    return ((zoom - 1) / (this.MAX_ZOOM - 1)) * 100;
  }

  saveCroppedImage() {
    if (!this.image.src) {
      this.handleError('画像が選択されていません。');
      return;
    }

    const cropSize = this.CANVAS_WIDTH;
    const cropX = -this.imageX / this.scale;
    const cropY = -this.imageY / this.scale;
    const originalCropSize = cropSize / this.scale;

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalCropSize;
    tempCanvas.height = originalCropSize;
    const tempCtx = tempCanvas.getContext('2d');

    if (!tempCtx) {
      this.handleError('Canvasのコンテキストを取得できませんでした。');
      return;
    }

    try {
      tempCtx.drawImage(
        this.image,
        cropX,
        cropY,
        originalCropSize,
        originalCropSize,
        0,
        0,
        originalCropSize,
        originalCropSize
      );

      tempCanvas.toBlob((blob) => {
        if (!blob) {
          this.handleError('Blobの生成に失敗しました。');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'cropped_image.png';
        link.click();

        URL.revokeObjectURL(url);

        tempCanvas.width = 0;
        tempCanvas.height = 0;
      }, 'image/png');
    } catch (error) {
      this.handleError('画像の切り抜きに失敗しました。');
    }
  }
}
