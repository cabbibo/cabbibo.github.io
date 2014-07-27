var imagePlaneGeo = new THREE.PlaneGeometry( 200 , 200 / 1.6);

function Link( id , theta , params ){

  this.id = id;

  this.theta = theta;

  this.params = params;

  this.text = new PhysicsText( this.params.text );
  this.text.kill();

  this.active = false;
  this.dead   = true;

  this.mesh = G.textCreator.createMesh( this.params.name );

  this.mesh.hoverOver = this.hoverOver.bind( this );
  this.mesh.hoverOut  = this.hoverOut.bind( this );
  this.mesh.select    = this.select.bind( this );
  this.mesh.deselect  = this.deselect.bind( this );

  this.mesh.material.opacity = 1;
  this.mesh.material.transparent = true;
  this.mesh.material.blending = THREE.AdditiveBlending;
  this.mesh.material.depthWrite = false;
  this.mesh.materialNeedsUpdate = true;

  
 // this.texture = G.TEXTURES[ this.params.img ];
  this.image = new THREE.Object3D();
  this.images = [];
  
  for( var i =0; i < this.params.img.length; i++ ){

    var t = G.TEXTURES[ this.params.img[i] ];
    var img =  new THREE.Mesh( imagePlaneGeo , 
        new THREE.MeshBasicMaterial({
          map: t,
          //color: new THREE.Color( Math.random() , Math.random() , Math.random() ),
          side: THREE.DoubleSide,
          transparent: true
        })
    );

    var p = (i) / this.params.img.length
    console.log('P:  ' + p );
    img.position.x = ( p - .5 ) * 800;

    img.targetPos = img.position.clone();

    var x = (Math.random() - .5 ) * 500;
    var y = (Math.random() - .5 ) * 500;
    var z = (Math.random() - .5 ) * 500;

    img.position.set(x,y,z );

    var x = (Math.random() * 2 - .5 ) *2*Math.PI; 
    var y = (Math.random() * 2 - .5 ) *2*Math.PI; 
    var z = (Math.random() * 2 - .5 ) *2*Math.PI; 

    img.rotation.set(x,y,z );



    this.images.push( img );
    this.image.add( img );
  }
 
  this.neutralColor = new THREE.Color( 0x444444 );
  this.focusColor   = new THREE.Color( 0xbbbbbb );
  this.hoveredColor = new THREE.Color( 0xffffff );

  G.objectControls.add( this.mesh );

}

Link.prototype.focus = function(){}
Link.prototype.unFocus = function(){}

Link.prototype.activate = function(){


  if( this.deathTweening ){

    this.deathTween.stop();
    this.deathTweening = false;
    this.deathTween = undefined;
    this.text.live();
    this.tweenIn();
    //this.mesh.material.color = this.activeColor;
    
    console.log('Dead should be false: '+ this.dead );

  }


  if( this.dead == true ){

    this.text.live();
    this.tweenIn();
    //this.mesh.material.color = this.activeColor;
    

  }

  if( this.active ){

    console.log( 'already active' );

  }

  if( !this.dead ){

    //this.mesh.material.color = this.superColor;

  }

}

Link.prototype.deactivate = function(){


  this.mesh.material.color = this.neutralColor

  if( this.lifeTweening ){

    this.lifeTween.stop();
    this.lifeTweening = false;
    this.lifeTween = undefined;
    this.text.kill();
    this.tweenOut();

      //this.mesh.material.color = this.unactiveColor;


  }

  if( this.active ){

    this.text.kill();
    this.tweenOut();

    //this.mesh.material.color = this.unactiveColor;


  }
  

}

Link.prototype.tweenIn = function(){

  this.dead = false;

  var v = this.text.uniforms.opacity.value
  var s = {
    
    o : v, 
    
    p0x: this.images[0].position.x,  
    p0y: this.images[0].position.y,  
    p0z: this.images[0].position.z,
    
    p1x: this.images[1].position.x,  
    p1y: this.images[1].position.y,  
    p1z: this.images[1].position.z,
   
    p2x: this.images[2].position.x,  
    p2y: this.images[2].position.y,  
    p2z: this.images[2].position.z,

    r0x: this.images[0].rotation.x,
    r0y: this.images[0].rotation.y,
    r0z: this.images[0].rotation.z,

    r1x: this.images[1].rotation.x,
    r1y: this.images[1].rotation.y,
    r1z: this.images[1].rotation.z,

    r2x: this.images[2].rotation.x,
    r2y: this.images[2].rotation.y,
    r2z: this.images[2].rotation.z,

  };
 
  var e = {
    o : 1,

    p0x: this.images[0].targetPos.x,
    p0y: this.images[0].targetPos.y,
    p0z: this.images[0].targetPos.z,

    p1x: this.images[1].targetPos.x,
    p1y: this.images[1].targetPos.y,
    p1z: this.images[1].targetPos.z,

    p2x: this.images[2].targetPos.x,
    p2y: this.images[2].targetPos.y,
    p2z: this.images[2].targetPos.z,

    r0x: 0,
    r0y: 0,
    r0z: 0,

    r1x: 0,
    r1y: 0,
    r1z: 0,

    r2x: 0,
    r2y: 0,
    r2z: 0,
  
  };
    
  this.lifeTween = new G.tween.Tween( s ).to( e , 1000 );

  this.lifeTweening = true;
  s.link = this;
  
  s.random = [];
  
  this.lifeTween.onUpdate( function(t){

    this.link.text.uniforms.opacity.value = this.o;

    this.link.images[0].material.opacity = this.o;
    this.link.images[1].material.opacity = this.o;
    this.link.images[2].material.opacity = this.o;

    this.link.images[0].position.set( this.p0x , this.p0y , this.p0z );
    this.link.images[1].position.set( this.p1x , this.p1y , this.p1z );
    this.link.images[2].position.set( this.p2x , this.p2y , this.p2z );
    
    this.link.images[0].rotation.set( this.r0x , this.r0y , this.r0z );
    this.link.images[1].rotation.set( this.r1x , this.r1y , this.r1z );
    this.link.images[2].rotation.set( this.r2x , this.r2y , this.r2z );

  });

  this.lifeTween.onComplete( function(){

    this.link.lifeTweening = false;
    this.link.lifeTween = undefined;

    this.link.active = true;

  });

  this.lifeTween.start();


}


Link.prototype.tweenOut = function(){
 
  this.active = false;

  var v = this.text.uniforms.opacity.value

   var s = {
    
    o : v, 
    
    p0x: this.images[0].position.x,  
    p0y: this.images[0].position.y,  
    p0z: this.images[0].position.z,
    
    p1x: this.images[1].position.x,  
    p1y: this.images[1].position.y,  
    p1z: this.images[1].position.z,
   
    p2x: this.images[2].position.x,  
    p2y: this.images[2].position.y,  
    p2z: this.images[2].position.z,

    r0x: this.images[0].rotation.x,
    r0y: this.images[0].rotation.y,
    r0z: this.images[0].rotation.z,

    r1x: this.images[1].rotation.x,
    r1y: this.images[1].rotation.y,
    r1z: this.images[1].rotation.z,

    r2x: this.images[2].rotation.x,
    r2y: this.images[2].rotation.y,
    r2z: this.images[2].rotation.z,

  };
 
  var e = {
    
    o : 0,

    p0x: ( Math.random() - .5 ) * 4000,
    p0y: ( Math.random() - .5 ) * 4000,
    p0z: ( Math.random() - .5 ) * 4000,

    p1x: ( Math.random() - .5 ) * 4000,
    p1y: ( Math.random() - .5 ) * 4000,
    p1z: ( Math.random() - .5 ) * 4000,

    p2x: ( Math.random() - .5 ) * 4000,
    p2y: ( Math.random() - .5 ) * 4000,
    p2z: ( Math.random() - .5 ) * 4000,

    r0x: Math.random() * 1 * Math.PI,
    r0y: Math.random() * 1 * Math.PI,
    r0z: Math.random() * 1 * Math.PI,

    r1x: Math.random() * 1 * Math.PI,
    r1y: Math.random() * 1 * Math.PI,
    r1z: Math.random() * 1 * Math.PI,

    r2x: Math.random() * 1 * Math.PI,
    r2y: Math.random() * 1 * Math.PI,
    r2z: Math.random() * 1 * Math.PI,
  
  };


  this.deathTween = new G.tween.Tween( s ).to( e , 3000 );
  this.deathTweening = true;
 
  s.link = this;

  this.deathTween.onUpdate( function(){

    this.link.text.uniforms.opacity.value = this.o;
    this.link.images[0].material.opacity = this.o;
    this.link.images[1].material.opacity = this.o;
    this.link.images[2].material.opacity = this.o;
    
    this.link.images[0].position.set( this.p0x , this.p0y , this.p0z );
    this.link.images[1].position.set( this.p1x , this.p1y , this.p1z );
    this.link.images[2].position.set( this.p2x , this.p2y , this.p2z );
    
    this.link.images[0].rotation.set( this.r0x , this.r0y , this.r0z );
    this.link.images[1].rotation.set( this.r1x , this.r1y , this.r1z );
    this.link.images[2].rotation.set( this.r2x , this.r2y , this.r2z );

  });

  this.deathTween.onComplete( function(){

    this.link.deathTweening = false;

    this.link.dead = true;

    this.link.deathTween = undefined;

  });

  this.deathTween.start();

}

Link.prototype.update = function(){

  if( !this.dead ){
    this.text.update();
  }


}

Link.prototype.hoverOver = function(){


  G.AUDIO[ this.params.note ].play();
  this.mesh.material.color = this.hoveredColor;

  G.hoverOver( this.id );
}

Link.prototype.hoverOut = function(){

  if( !this.dead ){

    this.mesh.material.color = this.focusColor;


  }else{

    this.mesh.material.color = this.neutralColor;

  }
  G.hoverOut( this.id );
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



