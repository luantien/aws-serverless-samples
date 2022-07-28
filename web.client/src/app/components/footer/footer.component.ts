import { Component } from '@angular/core';
import { AppMainComponent } from 'src/app/app.main.component';

@Component({
    selector: 'app-footer',
    templateUrl: 'footer.component.html',
})
export class FooterComponent {
    constructor(public appMain: AppMainComponent) {}
}
