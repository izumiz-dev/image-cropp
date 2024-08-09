import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ImageCropperComponent } from './image-cropper/image-cropper.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, ImageCropperComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent {
  title = 'image-cropp';
}
