
function Link( id , params ){

  this.id = id;
  this.params = params;
  this.started = false;

  this.weight = Math.random() * .3 + .2;
  //this.weight = .1;

  this.mesh = G.textCreator.createMesh( this.params.name );

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
      new THREE.PlaneGeometry( 200 * 1.618 , 200 ),
      new THREE.MeshBasicMaterial({
        map: THREE.ImageUtils.loadTexture( this.params.img )
      })
    );
 
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


Link.prototype.update = function(){

  if( !this.params.sm ){
   
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
    console.log('YASSS');
    G.hoverOver( this.id , false );
  }else{

    console.log('NOO');

  }

}

Link.prototype.hoverOver = function( recursed ){


  var n = notes[ Math.floor( Math.random() * notes.length) ];
 // console.log( this.params.name );
  G.AUDIO[ n ].play();

  this.mesh.material.opacity = 1;
  this.img.material.opacity = 1;

}

Link.prototype._hoverOut = function(){

  this.hoverOut();
  if( this.sm == false ){
    G.hoverOut( this.id , false );
  }

}

Link.prototype.hoverOut = function( recursed ){

  this.mesh.material.opacity = .5;
  this.img.material.opacity = .5;

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



