import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import * as allIcons from 'ionicons/icons';

import { SidePanelComponent } from '../components/side-panel/side-panel.component';
import {
  IonContent,
  IonCard,
  IonCardSubtitle,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonApp,
  IonTitle,
  IonHeader,
  IonToolbar,
  IonFooter,
} from '@ionic/angular/standalone';

//import { IonHeader, IonToolbar, IonContent } from '@ionic/angular/standalone';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: true,
  imports: [
    IonCardContent,
    IonCardTitle,
    IonCardHeader,
    IonCardSubtitle,
    IonCard,
    IonContent,
    SidePanelComponent,
  ],
})
export class HomePage {
  panelCollapsedLeft = false;
  panelEnabledLeft = true;
  panelCollapsedRight = false;
  panelEnabledRight = true;
  panelCollapsedBottom = true;
  panelEnabledBottom = true;
  constructor() {
    addIcons(allIcons);
  }
}
