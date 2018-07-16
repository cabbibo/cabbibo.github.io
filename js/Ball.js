function Ball(id , params){


  this.id = id;
  this.params = params;
  this.hovered = false;

  console.log(params);

  this.importance  = this.params.importance || 4

  this.mat = new THREE.MeshBasicMaterial({
    color: new THREE.Color( this.params.color ),
    map: THREE.ImageUtils.loadTexture( this.params.img )
  });
  this.mat = new THREE.MeshNormalMaterial({
    //map: THREE.ImageUtils.loadTexture( this.params.img )
  });

  this.mat = new THREE.ShaderMaterial({
  
          vertexShader: G.shaders.vs.rainbow,
          fragmentShader: G.shaders.fs.rainbow,
          shading: THREE.FlatShading,
/*
          attributes:{

            vertColor:{ type:"v3" , value: CONVEX_COLORS },

          },*/
          uniforms:{
            t_matcap:{type:"t" , value:G.TEXTURES['matcap']},
            scrollPos:{type:"f" , value: G.scrollPos },
            t_audio: G.t_audio
          },
          side: THREE.DoubleSide
        });

  this.mesh = new THREE.Mesh( 

      new THREE.IcosahedronGeometry( this.importance * 3 , 1 ) ,  
      this.mat
  );

   /* this.mesh = new THREE.Mesh( 
    
      new THREE.PlaneGeometry( this.importance * 10 , this.importance * 10 * .618 ) ,  
      this.mat
  );*/

 /* this.mesh = new THREE.Mesh( 
      new THREE.BoxGeometry( this.importance * 3 , this.importance* 3 , this.importance* 20 ) ,  
      this.mat
  );
*/
   
  this.mesh.hoverOver = this._hoverOver.bind( this );
  this.mesh.hoverOut  = this._hoverOut.bind( this );
  this.mesh.select    = this.select.bind( this );
  this.mesh.deselect  = this.deselect.bind( this );

  
 // this.mesh.material.opacity = .8;
  this.mesh.material.transparent = true;
//  this.mesh.material.blending = THREE.AdditiveBlending;
  //this.mesh.material.depthWrite = false;
  this.mesh.materialNeedsUpdate = true; 
  
  this.position = this.mesh.position;
  this.velocity = new THREE.Vector3();

  G.objectControls.add( this.mesh );

  this.label = G.textCreator.createMesh( params.name );
  this.label.rotation.y = 180;
  this.label.position.x = 100;
 // this.mesh.add(this.label);

}

Ball.prototype._hoverOver = function(){

  this.hoverOver();
  //G.beginScroll( this.id );



   //G.hoverOver( this.id , true );

}

Ball.prototype.hoverOver = function(){

  //this.hovered = true;


  //this.mesh.add(this.label);
  G.tv1.copy( this.position );

  console.log( 'hes;s' );
  G.tv1.sub( G.camera.position );
  G.tv1.normalize();
  G.tv1.multiplyScalar( -1000);
  this.position.copy(  G.camera.position );
  this.position.sub( G.tv1 );

  this.mesh.rotation.x = 0;
  this.mesh.rotation.y = 0;
  this.mesh.rotation.z = 0;

  var n = notes[ Math.floor( Math.random() * notes.length) ];
 // console.log( this.params.name );
  G.AUDIO[ n ].play();

 // this.mesh.material.color.setRGB( 1 , 1 , 1 );
  //this.mesh.material.opacity = 1;

}

Ball.prototype._hoverOut = function(){
  this.hoverOut();
  G.hoverOut( this.id , true );

}
Ball.prototype.hoverOut = function(){
  this.hovered = false;

 // this.mesh.remove(this.label);
 ////////////////// this.mesh.material.color.setRGB( .2 , .2 , .2 );
  
 // this.mesh.material.opacity = .5;
}

Ball.prototype.select = function(){
  
  if( this.params.link ){
    window.location = this.params.link
  }

  //G.select( this.id );

}


Ball.prototype.deselect = function(){ 
  G.deselect( this.id );
}


