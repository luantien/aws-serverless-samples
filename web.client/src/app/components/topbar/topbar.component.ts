import { Component } from '@angular/core';
import { AppMainComponent } from 'src/app/app.main.component';
import { MenuItem } from 'primeng/api';

@Component({
    selector: 'app-topbar',
    templateUrl: 'topbar.component.html',
})
export class TopBarComponent {
    items: MenuItem[];

    constructor(public appMain: AppMainComponent) {}
}
