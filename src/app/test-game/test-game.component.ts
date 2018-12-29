import { Component, OnInit, ViewChild, ElementRef } from '@angular/core';
import { MyGame } from 'app/jt-game/my-game';

@Component({
  selector: 'mik-scroller-game',
  templateUrl: './test-game.component.html',
  styleUrls: ['./test-game.component.less']
})
export class TestGameComponent implements OnInit {

  @ViewChild('myDiv')
  myCanvasElem: ElementRef;

  constructor() { }

  ngOnInit() {
    var game = new MyGame(this.myCanvasElem.nativeElement);
  }

}

// TODO: move to commons so this is available GLOBALLY
const nameof = <T>(name: keyof T) => name;
