  
uniform sampler2D t_matcap;
uniform float scrollPos;
uniform sampler2D t_audio; 
varying vec2 vSEM;
varying vec3 vEye;
varying vec3 vNorm;
varying float vFR;
varying vec3 vPos;
varying vec3 vColor;
$simplex

void main(){

  vec4 sem = texture2D( t_matcap , vSEM );

  vec4 nCol =  vec4( vNorm * .5 + .7 , 1. );

//  float s = snoise( vPos * vec3( .01 , .001 , .001) + vec3(  scrollPos *.001 , scrollPos *.0001 , scrollPos *.0001 ));// * dot( vEye , vNorm );
  //if( s < -.3) discard;//sem = vec4( 0.,0.,0.,.2);

 // vec4 aC = texture2D( t_audio , vec2( abs( s ) , 0. ) );
  vec4 color = nCol;// * sem + nCol * pow(( 1.-abs(vFR)) , 4. );
  gl_FragColor =sem* vec4(color.xyz ,1.);// aC * nCol + nCol * .8 * sem;

}

