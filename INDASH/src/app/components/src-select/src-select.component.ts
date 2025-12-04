/* eslint-disable @angular-eslint/no-empty-lifecycle-method */
import { CommonModule } from '@angular/common';
import {
  Component,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  IonModal, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
  IonSearchbar, IonContent, IonList, IonItem, IonCheckbox
} from '@ionic/angular/standalone';

@Component({
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    IonModal, IonHeader, IonToolbar, IonButtons, IonButton, IonTitle,
    IonSearchbar, IonContent, IonList, IonItem, IonCheckbox
  ],
  selector: 'app-src-select',
  templateUrl: './src-select.component.html',
  styleUrls: ['./src-select.component.scss'],
})
export class SrcSelectComponent implements OnChanges {
  @Input() title = 'Pencarian data';
  @Input() data: [] | any;
  @Input() color = 'dark';
  @Input() itemTextField = 'NAMA';
  @Input() multiple = false;
  @Output() selectedItems: EventEmitter<any> = new EventEmitter();

  isOpen = false;
  selected: [] | any;
  filtered: [] | any;

  constructor() {}

  @ViewChild('searchBar') inputBar!: IonSearchbar;
  onDidPresent() {
    this.inputBar.setFocus();
  }

  ngOnChanges(changes: SimpleChanges): void {
    //set empty for speed;
    this.filtered = [];
  }

  open() {
    this.isOpen = true;
  }

  cancel() {
    this.isOpen = false;
  }

  multiSelected() {
    this.selected = this.data.filter((item: any) => item.selected);
    //console.log(this.selected);
    this.selectedItems.emit(this.selected);
    this.isOpen = false;
  }

  itemSelected() {
    //console.log(this.multiple);
    if (!this.multiple) {
      //console.log("selected :" + this.selected?.length);
      if (this.selected?.length) {
        this.selected[0].selected = false;
      }

      this.selected = this.data.filter((item: any) => item.selected);
      //console.log(this.selected);
      this.selectedItems.emit(this.selected);
      this.isOpen = false;
    }
  }

  leaf = (obj: any) =>
    this.itemTextField.split('.').reduce((value, el) => value[el], obj);

  filterData(event: any) {
    let filter = 'empty';
    if (event.detail.value.length > 0) {
      filter = event.detail.value?.toLocaleLowerCase();
      //console.log(filter);
    } else {
      this.selected = this.data.filter((item: any) => item.selected);
      //console.log("before");
      //console.log(this.selected);
      if (this.selected?.length) {
        for (let i = 0; i < this.selected.length; i++) {
          this.selected[i].selected = false;
        }
      }
      this.selectedItems.emit(this.selected);
      //console.log("after");
      //console.log(this.selected);
    }
    this.filtered = this.data?.filter((item: any) => {
      return this.leaf(item)?.toLocaleLowerCase().indexOf(filter) >= 0;
    });
  }
}
