import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';

import { AppComponent } from './app.component';
import { TestGameComponent } from './test-game/test-game.component';

@NgModule({
  imports: [
    BrowserModule
  ],
  declarations: [
    AppComponent,
    TestGameComponent,
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
