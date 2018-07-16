function Section( params ){


   this.mesh = G.textCreator.createMesh( params.title );
   this.mesh.position.z = 20;
   this.mesh.position.y = 40;
   //this.mesh.position.x = 300;

   var geo = new THREE.Geometry();
   geo.vertices.push( new THREE.Vector3( -150 , -params.links.length * SIZE , 0  ) );
   geo.vertices.push( new THREE.Vector3( -150 , 0 , 0  ) );
   geo.vertices.push( new THREE.Vector3( 150 , 0 , 0  ) );
   //geo.vertices.push( new THREE.Vector3( 200 , 20 , 0  ) );

   var mat = new THREE.LineBasicMaterial();
    
   this.line = new THREE.Line( geo , mat );

   this.scene = new THREE.Object3D();

   this.scene.add( this.mesh );
   this.scene.add( this.line );




}
Section.prototype.activate = function(){

  G.scene.add( this.scene );

}
Section.prototype.update = function(){

  this.scene.position.y = this.scrollPos + G.scrollPos;

 // var p = this.scene.position.y;
 // this.scene.position.y += (this.targetPos - p) / (10*this.weight);

    if( this.scene.position.y > G.maxPos/2 ){
      this.scene.position.y -= G.maxPos
        this.scrollPos-= G.maxPos
    }

    if( this.scene.position.y < -G.maxPos/2 ){
      this.scene.position.y += G.maxPos
       this.scrollPos += G.maxPos
    }

    /* if( this.targetPos> G.maxPos/2 ){
      this.targetPos -= G.maxPos
       this.scrollPos -= G.maxPos
      this.scene.position.y = this.targetPos
    }

    if( this.targetPos < -G.maxPos/2 ){
       this.targetPos += G.maxPos
       this.scrollPos += G.maxPos
      this.scene.position.y = this.targetPos
    }*/



}
