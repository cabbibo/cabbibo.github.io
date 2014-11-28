function Ball(id , params){


  this.id = id;
  this.params = params;
  this.hovered = false;

  this.importance  = this.params.importance || 40

  this.mat = new THREE.MeshBasicMaterial({
    map: THREE.ImageUtils.loadTexture( this.params.img )
  });
  this.mesh = new THREE.Mesh( 
      new THREE.IcosahedronGeometry( this.importance , 3 ) ,  
      this.mat
  );
  this.mesh.hoverOver = this._hoverOver.bind( this );
  this.mesh.hoverOut  = this._hoverOut.bind( this );
  this.mesh.select    = this.select.bind( this );
  this.mesh.deselect  = this.deselect.bind( this );

  
  this.mesh.material.opacity = .5;
  this.mesh.material.transparent = true;
 // this.mesh.material.blending = THREE.AdditiveBlending;
 // this.mesh.material.depthWrite = false;
  this.mesh.materialNeedsUpdate = true; 
  
  this.position = this.mesh.position;
  this.velocity = new THREE.Vector3();

  G.objectControls.add( this.mesh );

}

Ball.prototype._hoverOver = function(){

  this.hoverOver();
  G.beginScroll( this.id );

   G.hoverOver( this.id , true );

}
Ball.prototype.hoverOver = function(){

  this.hovered = true;

  var n = notes[ Math.floor( Math.random() * notes.length) ];
 // console.log( this.params.name );
  G.AUDIO[ n ].play();

  this.mesh.material.opacity = 1;

}

Ball.prototype._hoverOut = function(){

  this.hoverOut();
  G.hoverOut( this.id , true );

}
Ball.prototype.hoverOut = function(){
  this.hovered = false;
  this.mesh.material.opacity = .5;
}

Ball.prototype.select = function(){
  
 /* if( this.params.link ){
    window.location = this.params.link
  }*/

  G.select( this.id );

}


Ball.prototype.deselect = function(){ 
  G.deselect( this.id );
}


