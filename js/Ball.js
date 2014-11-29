function Ball(id , params){


  this.id = id;
  this.params = params;
  this.hovered = false;

  this.importance  = this.params.importance || 4

  this.mat = new THREE.MeshBasicMaterial({
    color: 0x333333,
    map: THREE.ImageUtils.loadTexture( this.params.img )
  });
  /*this.mat = new THREE.MeshNormalMaterial({
    //map: THREE.ImageUtils.loadTexture( this.params.img )
  });*/
  this.mesh = new THREE.Mesh( 
      new THREE.IcosahedronGeometry( this.importance * 3 , 3 ) ,  
      this.mat
  );
  this.mesh.hoverOver = this._hoverOver.bind( this );
  this.mesh.hoverOut  = this._hoverOut.bind( this );
  this.mesh.select    = this.select.bind( this );
  this.mesh.deselect  = this.deselect.bind( this );

  
  //this.mesh.material.opacity = .5;
  //this.mesh.material.transparent = true;
 // this.mesh.material.blending = THREE.AdditiveBlending;
 // this.mesh.material.depthWrite = false;
  this.mesh.materialNeedsUpdate = true; 
  
  this.position = this.mesh.position;
  this.velocity = new THREE.Vector3();

  G.objectControls.add( this.mesh );

}

Ball.prototype._hoverOver = function(){

  this.hoverOver();
/*  G.tv1.copy( this.position );
  G.tv1.sub( G.camera.position );
  G.tv1.multiplyScalar( .3 );
  this.position.sub( G.tv1 );*/
  G.beginScroll( this.id );

   G.hoverOver( this.id , true );

}
Ball.prototype.hoverOver = function(){

  this.hovered = true;

  var n = notes[ Math.floor( Math.random() * notes.length) ];
 // console.log( this.params.name );
  G.AUDIO[ n ].play();

  this.mesh.material.color.setRGB( 1 , 1 , 1 );
  //this.mesh.material.opacity = 1;

}

Ball.prototype._hoverOut = function(){

  this.hoverOut();
  G.hoverOut( this.id , true );

}
Ball.prototype.hoverOut = function(){
  this.hovered = false;
  this.mesh.material.color.setRGB( .2 , .2 , .2 );
  
 // this.mesh.material.opacity = .5;
}

Ball.prototype.select = function(){
  
  if( this.params.link ){
    window.location = this.params.link
  }

  G.select( this.id );

}


Ball.prototype.deselect = function(){ 
  G.deselect( this.id );
}


