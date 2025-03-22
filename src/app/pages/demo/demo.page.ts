import { Component, CUSTOM_ELEMENTS_SCHEMA, OnInit } from '@angular/core';
import { ComponentsModule } from '../../../lib/components/components.module';

@Component({
  standalone: true,
  schemas: [CUSTOM_ELEMENTS_SCHEMA],
  imports: [ComponentsModule],
  selector: 'for-angular-demo',
  templateUrl: './demo.page.html',
  styleUrls: ['./demo.page.scss'],
})
export class DemoPage implements OnInit {
  constructor() {}

  ngOnInit() {}
}
