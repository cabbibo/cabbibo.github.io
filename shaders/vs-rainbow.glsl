attribute vec3 vertColor;

varying vec2 vSEM;
varying vec3 vEye;
varying vec3 vNorm;
varying vec3 vPos;
varying vec3 vColor;
varying float vFR;

$semLookup

void main(){

  vColor = vertColor;
 
  vec4 mvPos = modelViewMatrix * vec4( position, 1.0 );
  
 
  vPos = position;
  vEye = normalize( mvPos.xyz );
  vNorm = normalize(normalMatrix * normal);

  vFR = dot( vEye , vNorm );
  
  vSEM = semLookup( vEye , vNorm );

  gl_Position = projectionMatrix * mvPos;

}


