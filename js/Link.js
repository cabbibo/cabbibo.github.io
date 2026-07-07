
function Link( id , params ){

  this.id = id;
  this.params = params;
  this.started = false;

  this.weight = Math.random() * .3 + .2;
  //this.weight = .1;


  this.time = { type:"f",value:0}
  this.startTime = { type:"f",value:0}

  this.mesh = G.textCreator.createMesh( this.params.name );

  // Info shows as GPGPU physics text (see js/PhysicsText.js) — but only when the
  // link actually has real copy, not a placeholder. Built lazily; hidden until hover.
  this._infoActive = false;
  this._hasInfo = false;
  if( Link.hasRealInfo( this.params.info ) ){
    try{
      this.info = new PhysicsText( this.params.info );
      this.info.deactivate(); // not in the scene until hovered
      this._hasInfo = true;
    }catch( e ){
      console.warn( 'PhysicsText init failed for "' + this.params.name + '":', e );
      this.info = Link.noopInfo();
    }
  }else{
    this.info = Link.noopInfo();
  }





  this.mesh.hoverOver = this.hoverOver.bind( this );
  this.mesh.hoverOut  = this.hoverOut.bind( this );
  this.mesh.select    = this.select.bind( this );
  this.mesh.deselect  = this.deselect.bind( this );

  //this.mesh.position.y = 50;
  this.mesh.position.z = 50;

  this.sm =this.params.sm;


  if( !G.mobile ){
    this.mesh.material.opacity = .5;
    this.mesh.material.transparent = true;
    this.mesh.material.blending = THREE.AdditiveBlending;
    this.mesh.material.depthWrite = false;
    this.mesh.materialNeedsUpdate = true; 
  }

  if( !this.params.sm ){
    this.img = new THREE.Mesh(  
      new THREE.PlaneGeometry( 150 * 1.618 , 150 ),
      new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture( this.params.img )
      })
    );

    if( this.params.screenshots){
      this.screenshots = []
      for( var i = 0; i < this.params.screenshots.length; i++ ){

        var img = new THREE.Mesh(  
          new THREE.PlaneGeometry( 120 * 1.618 , 120 ),
          new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture( this.params.img )
          })
        );
        img.position.x = i * 240 - (1*200);
        img.position.y = -150;
        G.scene.add(img);
        this.screenshots.push( img);
      }

      this.background =  new THREE.Mesh(  
          new THREE.PlaneGeometry( 480 * 1.618 , 480 ),
          new THREE.MeshBasicMaterial({
            color:0x000000,
            opacity: .5,
            transparent : true
          })
        );  
      this.background.position.x = 40;
      this.background.position.z = -20;
        G.scene.add(this.background); 
    }
 
  }else{

    this.img = new THREE.Mesh(  
      new THREE.PlaneGeometry( 50 , 50 ),
      new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture( this.params.img )
      })
    );


  }

  if( !G.mobile || this.params.sm === true ){

    this.img.material.opacity = .5;
    this.img.material.transparent = true;
    this.img.material.blending = THREE.AdditiveBlending;
    this.img.material.depthWrite = false;
    this.img.materialNeedsUpdate = true; 
  }

  this.img.hoverOver = this._hoverOver.bind( this );
  this.img.hoverOut  = this._hoverOut.bind( this );
  this.img.select    = this.select.bind( this );
  this.img.deselect  = this.deselect.bind( this );


  this.neutralColor = new THREE.Color( 0x444444 );
  this.focusColor   = new THREE.Color( 0xbbbbbb );
  this.hoveredColor = new THREE.Color( 0xffffff );

  G.objectControls.add( this.img );
  //G.objectControls.add( this.mesh );

  this.scene = new THREE.Object3D();
  this.scene.add( this.img );
  this.scene.add( this.mesh );

  // G.objectControls.add( this.img );
  //G.objectControls.add( this.mesh );



}


// True only when the link has real copy worth showing (not a placeholder stub).
Link.hasRealInfo = function( info ){
  if( !info ) return false;
  var s = ( '' + info ).trim();
  if( s.length < 13 ) return false;           // drops "Made for" and similar stubs
  if( /^i am info/i.test( s ) ) return false; // drops the "I am infoN" placeholders
  return true;
};

// Stand-in when there's no info, so hover code can call the same methods safely.
Link.noopInfo = function(){
  var noop = function(){};
  return { update:noop, activate:noop, deactivate:noop, live:noop, kill:noop, instant:noop };
};

Link.prototype.update = function(){

  // Step the physics-text sim while its info panel is on screen.
  if( this._infoActive && this.info && this.info.update ){ this.info.update(); }

  if( !this.params.sm ){

    //this.info.material.uniforms.time1.value += .1;
    //this.info.material.needsUpdate = true;
    //this.time.value += .1;
    //this.startTime.value += .1;
   
    this.targetPos = this.scrollPos + G.scrollPos;

    var p = this.scene.position.y;
    this.scene.position.y += (this.targetPos - p) / (10*this.weight);

    if( this.scene.position.y > G.maxPos/2 ){
      this.scene.position.y -= G.maxPos
        this.scrollPos-= G.maxPos
    }

    if( this.scene.position.y < -G.maxPos/2 ){
      this.scene.position.y += G.maxPos
       this.scrollPos += G.maxPos
    }

     if( this.targetPos> G.maxPos/2 ){
      this.targetPos -= G.maxPos
       this.scrollPos -= G.maxPos
      this.scene.position.y = this.targetPos
    }

    if( this.targetPos < -G.maxPos/2 ){
       this.targetPos += G.maxPos
       this.scrollPos += G.maxPos
      this.scene.position.y = this.targetPos
    }


    G.tv1.copy( this.scene.position );
    G.tv1.y -= (this.targetPos- this.scene.position.y );
    G.tv1.z += 300;

   // this.scene.position.y %= G.maxPos /2;

   this.scene.lookAt( G.tv1);
  //console.log( 'hello' );
  //
  }

}
Link.prototype.focus = function(){}
Link.prototype.unFocus = function(){}
Link.prototype.activate = function(){

  G.scene.add( this.scene );
 
}
Link.prototype.addToObject = function( obj ){
  obj.add(this.scene);
}

Link.prototype.deactivate = function(){


}

Link.prototype.tweenIn = function(){

}


Link.prototype.tweenOut = function(){
 
 
}


Link.prototype._hoverOver = function(){

  this.hoverOver();
  if( this.sm === false ){
    G.hoverOver( this.id , false );
  }else{


  }

}

Link.prototype.hoverOver = function( recursed ){

  if( G.activeLink && G.activeLink !== this ){
    G.activeLink.mesh.material.opacity = .5;
    G.activeLink.img.material.opacity = .5;
  }
  G.activeLink = this;

  var n = notes[ Math.floor( Math.random() * notes.length) ];
  G.AUDIO[ n ].play();

  this.mesh.material.opacity = 1;
  this.img.material.opacity = 1;

if( this.screenshots ){
  for( var i =0; i < this.screenshots.length; i++ ){
    this.screenshots[i].visible = true;
  }
}

if( this.background ){ this.background.visible = true; }

// Info panel stays up until a *different* info-bearing item is hovered.
// Hovering a blank item leaves whatever text is already showing in place.
if( this._hasInfo ){
  if( G.activeInfoLink && G.activeInfoLink !== this ){ G.activeInfoLink.hideInfo(); }
  G.activeInfoLink = this;
  this.showInfo();
}

}

// Reveal the physics text: add it to the scene, seed the sim, and restart the fade-in.
Link.prototype.showInfo = function(){
  if( !this.info || this._infoActive ) return;
  this._infoActive = true;
  this.info.activate();   // adds particles to scene + sets alive
  if( this.info.instant ){ this.info.instant(); } // snap sim to a valid state first frame
  if( this.info.uniforms && this.info.uniforms.startTime ){
    this.info.uniforms.startTime.value = G.timer.value;
  }
};

// Hide the physics text and stop stepping its sim.
Link.prototype.hideInfo = function(){
  if( !this.info || !this._infoActive ) return;
  this._infoActive = false;
  this.info.deactivate();
};

Link.prototype._hoverOut = function(){

  this.hoverOut();
  if( this.sm == false ){
    G.hoverOut( this.id , false );
  }

}

Link.prototype.hoverOut = function( recursed ){

  if( this.screenshots ){
    for( var i =0; i < this.screenshots.length; i++ ){
      this.screenshots[i].visible = false;
    }
  }

  if( this.background ){ this.background.visible = false; }

  // NOTE: info stays up on hover-out — it's only swapped when another
  // info-bearing item is hovered (see hoverOver / G.activeInfoLink).

}

Link.prototype.select = function(){
  
  if( this.params.link ){
    window.location = this.params.link
  }

  G.select( this.id );

}


Link.prototype.deselect = function(){ 
  G.deselect( this.id );
}



