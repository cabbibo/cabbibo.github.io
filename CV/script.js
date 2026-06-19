/* ============================================================
   Cabbibo CV — script.js

   To add a new work entry: find the right CATEGORY array below
   and add an object with: title, collab?, year?, desc?, links[].
   Each link is { label, url }. Items with no `links` render as
   text-only (greyed). Save and refresh — no build step.
   ============================================================ */

// ------------------------------------------------------------
// DATA
// ------------------------------------------------------------

const CATEGORIES = [
  {
    name: "My Favs",
    meta: "Personal highlights",
    items: [
      { title: "ENOUGH", thumb: "../img/sites/enough.png", desc: "FWA Site of the Day & Month · IGF Nuovo Honorable Mention.", links: [{ label: "Site", url: "https://cabbi.bo/enough/" }] },
      { title: "SOPHIE — FACESHOPPING", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=es9-P1SOeHU" }] },
      { title: "Olafur Eliasson: Rainbow", collab: "Olafur Eliasson", year: "2017", desc: "Acute Art, London.", links: [{ label: "Vimeo", url: "https://vimeo.com/220790665" }] },
      { title: "Jónsi: Vox", thumb: "https://static-assets.artlogic.net/w_1388,h_620,c_limit,f_auto,fl_lossy,q_auto/ws-tanyabonakdargallery/usr/exhibitions/images/exhibitions/753/jonsi_install_gallery-3_01.jpg", collab: "Jónsi", year: "2023", desc: "Tanya Bonakdar Gallery, Los Angeles.", links: [{ label: "Exhibition", url: "https://www.tanyabonakdargallery.com/exhibitions/753-jonsi-vox-tanya-bonakdar-gallery-los-angeles/" }] },
      { title: "Finn Keane — Careless", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=e7YuB7GKcTM" }] },
      { title: "AFK", thumb: "assets/afk.jpg", collab: "PC Music / AG Cook", links: [{ label: "Site", url: "https://cabbi.bo/afk/" }] },
      { title: "dannyelfman.com", thumb: "assets/DannyElfman.png", collab: "Danny Elfman", links: [{ label: "Site", url: "https://dannyelfman.com" }] },
      { title: "Lazarus Under Lights", thumb: "../img/sites/dawn.png", collab: "Sam Rolfes / DAWN", links: [{ label: "Site", url: "https://cabbi.bo/dawnF2/" }] },
      { title: "Life of Us", thumb: "https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2017/02/life_of_us.jpg", collab: "Chris Milk, Aaron Koblin, Within", year: "2017", desc: "Sundance New Frontier.", links: [{ label: "Unity", url: "https://unity.com/madewith/life-of-us" }] },
      { title: "BLARP!", links: [{ label: "Steam", url: "https://store.steampowered.com/app/420840/BLARP/" }] },
      { title: "Bee Two Bee", desc: "Live show.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=LvGUvJTuDhg" }] },
      { title: "The Anatomy of a Jellyfish", thumb: "assets/jellyfish.png", links: [{ label: "Medium", url: "https://medium.com/@isaaclandoncohen/the-anatomy-of-a-jellyfish-5fa9337fcd92" }] },
      { title: "Dynamicland at Eyeo", thumb: "assets/eyeo.png", year: "2018", desc: "Dynamicland presentation at the Eyeo Festival.", links: [{ label: "Dynamicland", url: "https://dynamicland.org/2018/Dynamicland_at_Eyeo/" }] },
      { title: "Dynamicland", thumb: "https://dynamicland.org/2024/Front_shelf/8c7c199d7fe30d0b695537dcb6d7a702.jpg", desc: "Volunteer / resident / collaborator.", links: [{ label: "Dynamicland", url: "https://dynamicland.org/" }] },
      { title: "Velocity Field Interaction for Free-Space Gesture Interface and Control", thumb: "assets/velocityFieldInteraction.png", collab: "David S. Holz, Maxwell Sills", links: [{ label: "Justia", url: "https://patents.justia.com/patent/20250383719" }] },
      { title: "PhysicsRenderer", thumb: "../img/sites/physicsRenderer.png", desc: "three.js GPGPU utils — 221★", links: [{ label: "GitHub", url: "https://github.com/cabbibo/PhysicsRenderer" }] },
      { title: "ARQUA!", thumb: "assets/arqua.png", collab: "Viacom NEXT", year: "2017", desc: "AR aquarium builder for iOS.", links: [{ label: "Site", url: "https://cabbi.bo/arqua/" }] },
      { title: "Face! Plant!", thumb: "assets/faceplant.png", year: "2019", desc: "AR face-tracking experiments.", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1141030277948436485" }] },
      { title: "Responsive Bridge Design", thumb: "assets/responsiveBridgeDesign.png", year: "2018", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1034184124796260353" }] },
    ],
  },

  {
    name: "VR / Spatial",
    meta: "Steam · 2016–2018",
    items: [
      { title: "BLARP!", links: [{ label: "Steam", url: "https://store.steampowered.com/app/420840/BLARP/" }] },
      { title: "L U N E", collab: "JJ Verne", links: [{ label: "Steam", url: "https://store.steampowered.com/app/485880/L_U_N_E/" }] },
      { title: "Delila's Gift", links: [{ label: "Steam", url: "https://store.steampowered.com/app/538110/Delilas_Gift/" }] },
      { title: "Warka Flarka Flim Flam", links: [{ label: "Steam", url: "https://store.steampowered.com/app/573360/Warka_Flarka_Flim_Flam/" }] },
      { title: "My Lil' Donut", collab: "Tool of North America", links: [{ label: "Steam", url: "https://store.steampowered.com/app/506280/My_Lil_Donut/" }] },
      { title: "Audio Forager", collab: "Kyle McDonald", links: [{ label: "Steam", url: "https://store.steampowered.com/app/694550/Audio_Forager/" }] },
      { title: "Jellyfish Island", thumb: "assets/jellyfishIsland.jpg", year: "2017", links: [{ label: "Twitter", url: "https://twitter.com/Cabbibo/status/874800872802340864" }] },
    ],
  },

  {
    name: "Games Contracting",
    meta: "Visual & technical work",
    items: [
      { title: "Saturnalia", links: [{ label: "Steam", url: "https://store.steampowered.com/app/916350/Saturnalia/" }] },
      { title: "Wanderstop", links: [{ label: "Steam", url: "https://store.steampowered.com/app/1299460/Wanderstop/" }] },
    ],
  },

  {
    name: "Exhibitions & Installations",
    meta: "Museums · Galleries · Festivals",
    items: [
      { title: "Jónsi: SAD", thumb: "https://static-assets.artlogic.net/w_1600,h_1600,c_limit,f_auto,fl_lossy,q_auto/artlogicstorage/tanyabonakdargallery/images/view/76d793fe6efeb4874bd97f9a1fd2c676j/tanyabonakdargallery-j-nsi-sad-skammdegis-unglyndi-seasonal-affective-disorder-2024.jpg", collab: "Jónsi", year: "2024", desc: "National Museum of Iceland.", links: [{ label: "Gallery", url: "https://www.tanyabonakdargallery.com/artists/41-jonsi/works/12426-jonsi-sad-skammdegisunglyndi-seasonal-affective-disorder-2024/" }] },
      { title: "Jónsi: Vox", thumb: "https://static-assets.artlogic.net/w_1388,h_620,c_limit,f_auto,fl_lossy,q_auto/ws-tanyabonakdargallery/usr/exhibitions/images/exhibitions/753/jonsi_install_gallery-3_01.jpg", collab: "Jónsi", year: "2023", desc: "Tanya Bonakdar Gallery, Los Angeles.", links: [{ label: "Exhibition", url: "https://www.tanyabonakdargallery.com/exhibitions/753-jonsi-vox-tanya-bonakdar-gallery-los-angeles/" }] },
      { title: "Hayden Dunham: Transmutation", thumb: "https://flash---art.com/wp-content/uploads/2022/10/hayden_dunham_6-1024x683.jpg", collab: "Hayden Dunham", year: "2022", desc: "Company Gallery, New York.", links: [{ label: "Flash Art", url: "https://flash---art.com/2022/10/hayden-dunham/" }] },
      { title: "IM ‖ MATERIA", thumb: "assets/immateria.jpg", year: "2020", desc: "Solo exhibition, Museum of Other Realities.", links: [{ label: "MOR", url: "https://www.museumor.com/artwork/immateria" }] },
      { title: "NEXUS", thumb: "https://nexus.mutek.us/fullbanner.png", collab: "Lil Data", year: "2020", desc: "MUTEK Festival, SF.", links: [{ label: "Site", url: "https://nexus.mutek.us/" }] },
      { title: "Currents Virtual Festival", thumb: "https://currentsnewmedia.org/wp-content/uploads/2020/12/cabbibo_cohen.png", year: "2020", desc: "Currents New Media, Santa Fe.", links: [{ label: "Page", url: "https://currentsnewmedia.org/work/cabbibo/" }] },
      { title: "Teknopolis", thumb: "../img/sites/lune.png", year: "2019", desc: "Brooklyn Academy of Music." },
      { title: "Spatial Reality / Steps", thumb: "../img/sites/recursion.png", year: "2018", desc: "sp[a]ce Gallery, Pasadena.", links: [{ label: "ASC", url: "https://theasc.com/articles/spatial-reality-at-ayzenburg" }] },
      { title: "Olafur Eliasson: Rainbow", collab: "Olafur Eliasson", year: "2017", desc: "Acute Art, London.", links: [{ label: "Vimeo", url: "https://vimeo.com/220790665" }] },
      { title: "Float Museum", thumb: "assets/floatMuseum.png", year: "2017", desc: "SFMoMA. w/ Kate Parsons, Ben Vance.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=0HdwcFpVsdo" }] },
      { title: "The Art of VR", thumb: "assets/artAndVrAtSothebys.png", year: "2017", desc: "Sotheby's, New York.", links: [{ label: "Sotheby's", url: "https://www.sothebys.com/en/videos/vr-society-presents-the-art-of-vr-at-sothebys" }] },
      { title: "Life of Us", thumb: "https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2017/02/life_of_us.jpg", collab: "Chris Milk, Aaron Koblin, Within", year: "2017", desc: "Sundance New Frontier.", links: [{ label: "Unity", url: "https://unity.com/madewith/life-of-us" }] },
      { title: "H E N G E", collab: "Lil Data", desc: "MUTEK / Nexus.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=1pE19vchlRA" }] },
      { title: "3D Web Fest", thumb: "https://substackcdn.com/image/fetch/$s_!iLL_!,w_1200,h_675,c_fill,f_jpg,q_auto:good,fl_progressive:steep,g_auto/https%3A%2F%2Fbucketeer-e05bbc84-baa3-437e-9518-adb32be77984.s3.amazonaws.com%2Fpublic%2Fimages%2Ffd0843d2-6a14-4255-980f-e6d71a0d144d_1200x1800.jpeg", links: [{ label: "Page", url: "https://3dwebfest.splashthat.com/" }] },
      { title: "FILF", thumb: "assets/filf.jpg", links: [{ label: "Instagram", url: "https://www.instagram.com/whatthefilf/" }] },
    ],
  },

  {
    name: "Web / Interactive",
    meta: "cabbi.bo · cabbibo.com · wom.bs",
    items: [
      { title: "ENOUGH", thumb: "../img/sites/enough.png", desc: "FWA Site of the Day & Month · IGF Nuovo Honorable Mention.", links: [{ label: "Site", url: "https://cabbi.bo/enough/" }] },
      { title: "Light", thumb: "../img/sites/light.png", desc: "Interactive poem.", links: [{ label: "Site", url: "https://cabbi.bo/light/" }] },
      { title: "NoThing", thumb: "../img/sites/noThing.png", desc: "Interactive poem.", links: [{ label: "Site", url: "https://cabbi.bo/nothing/" }] },
      { title: "GROWTH", thumb: "../img/sites/growth.png", desc: "Christmas piece.", links: [{ label: "Site", url: "https://cabbi.bo/growth/" }] },
      { title: "Lazarus Under Lights", thumb: "../img/sites/dawn.png", collab: "Sam Rolfes / DAWN", links: [{ label: "Site", url: "https://cabbi.bo/dawnF2/" }] },
      { title: "Prismatic Realities", desc: "Talk + web piece.", links: [{ label: "Site", url: "https://cabbi.bo/prismaticReality/" }] },
      { title: "PLAID — Digging Remedy", thumb: "../img/sites/plaid.png", collab: "Plaid / Warp", links: [{ label: "Site", url: "https://cabbi.bo/pdr/" }] },
      { title: "PLAID — Maru / Polymer", thumb: "assets/plaidPolymer.png", collab: "Plaid / Warp", links: [{ label: "Site", url: "https://www.pppolymer.net/" }] },
      { title: "Insidious Rising", thumb: "https://storage.googleapis.com/gweb-experiments.appspot.com/9188-InsidiousRising-3.jpg", collab: "Hyphen Labs", links: [{ label: "Chrome Exp.", url: "https://experiments.withgoogle.com/insidious-rising" }] },
      { title: "TAJ — Adobe Design AYA", thumb: "assets/taj.jpg", collab: "Taj Francis (T Λ J)", desc: "Adobe Design AYA collaboration.", links: [{ label: "Site", url: "https://cabbi.bo/taj/" }] },
      { title: "Quoi — Avalon Emerson", thumb: "../img/sites/quoi.png", links: [{ label: "Site", url: "http://wom.bs/quoi/" }] },
      { title: "Beyond", thumb: "../img/sites/beyond.png", collab: "Spite", links: [{ label: "Site", url: "https://b-e-y-o-n-d.com/" }] },
      { title: "Rainbow Membrane", thumb: "assets/rainbowMembrane.png", collab: "Leap Motion × Steve Teeps", links: [{ label: "Site", url: "https://cabbi.bo/RainbowMembrane/" }] },
      { title: "Universe of Sound", thumb: "../img/sites/uOS.png", links: [{ label: "Site", url: "https://cabbibo.com/uOS" }] },
      { title: "Fall Sketches", thumb: "../img/sites/FallSketches.png", links: [{ label: "Site", url: "https://cabbi.bo/FallSketches/" }] },
      { title: "L-U-N-E (web version)", thumb: "../img/sites/lune.png", links: [{ label: "Site", url: "https://cabbi.bo/lune/" }] },
      { title: "Prism Simulations", thumb: "assets/prismSimulations.png", links: [{ label: "Site", url: "https://cabbi.bo/prism3/" }] },
      { title: "Hold Me", thumb: "assets/holdMe.jpg", collab: "JJ Verne", links: [{ label: "Site", url: "https://cabbi.bo/hold-me/" }] },
      { title: "Pulse", thumb: "../img/sites/pulse.png", collab: "JJ Verne", links: [{ label: "Site", url: "https://cabbi.bo/pulse/" }] },
      { title: "Needs", thumb: "../img/sites/Needs.png", collab: "JJ Verne", links: [{ label: "Site", url: "https://cabbi.bo/Needs/" }] },
      { title: "Moire No Future", thumb: "assets/moireNoFuture.jpg", collab: "Ghostly", links: [{ label: "Site", url: "https://cabbi.bo/moxTest1/" }] },
      { title: "AFK", thumb: "assets/afk.jpg", collab: "PC Music / AG Cook", links: [{ label: "Site", url: "https://cabbi.bo/afk/" }] },
      { title: "Drive", thumb: "../img/sites/drive.png", links: [{ label: "Site", url: "https://cabbi.bo/drive/" }] },
      { title: "Dotter", thumb: "../img/sites/dotter.png", links: [{ label: "Site", url: "https://cabbi.bo/dotter/" }] },
      { title: "Max Weisel portfolio", thumb: "../img/sites/egg.png", links: [{ label: "Site", url: "https://maxweisel.com/egg/" }] },
      { title: "gpu Curl Meshes", thumb: "https://lh3.googleusercontent.com/yCM-iSoWuhhKXaBqlwJKKPs6pqpRVen8MNQIx6DKHKVNXub_XYeXJgWG_IkstkS4MFNWo2QTRppbb5PlFsw13HHiEcQyrm-FkhzC", links: [{ label: "Chrome Exp.", url: "https://experiments.withgoogle.com/gpu-curl-meshes" }] },
      { title: "Shiny", thumb: "../img/sites/shinyText.png", links: [{ label: "Chrome Exp.", url: "https://experiments.withgoogle.com/shinytext" }] },
      { title: "Weird Kids", thumb: "../img/sites/weirdkids.png", links: [{ label: "Chrome Exp.", url: "https://experiments.withgoogle.com/weirdkids" }] },
      { title: "Saturn Strobe", thumb: "../img/sites/Bees.png", links: [{ label: "Site", url: "https://cabbi.bo/Bees/" }] },
      { title: "NVScene invite", thumb: "../img/sites/nvs.png", links: [{ label: "Site", url: "https://cabbi.bo/nvs/" }] },
      { title: "huldra", thumb: "../img/sites/huldra.png", links: [{ label: "Site", url: "https://cabbi.bo/huldra/" }] },
      { title: "diamonds", thumb: "../img/sites/diamonds.png", links: [{ label: "Site", url: "https://cabbi.bo/diamonds/" }] },
      { title: "gooey gpu gem", thumb: "../img/sites/skySphere.png", links: [{ label: "Site", url: "https://cabbi.bo/SKY-SPHERE/" }] },
      { title: "ML-Fellowship landing", thumb: "assets/mlFellowship.jpg", links: [{ label: "Site", url: "https://cabbi.bo/ML-Fellowship/" }] },
      { title: "Stellar Nursery (Nebula)", thumb: "assets/nebula.png", links: [{ label: "Site", url: "http://cabbibo.com/nebula/" }] },
      { title: "Sound Object Project", thumb: "assets/sop.png", links: [{ label: "Site", url: "http://cabbibo.com/soundObjectProject/" }] },
      { title: "Sol", thumb: "assets/sol.png", links: [{ label: "Site", url: "http://cabbibo.com/sol/" }] },
      { title: "Come Ballooning (AVBEATS)", thumb: "assets/avbeats.png", links: [{ label: "Site", url: "http://cabbibo.com/AVBEATS/" }] },
      { title: "Recursion", thumb: "../img/sites/recursion.png", links: [{ label: "Site", url: "http://cabbibo.com/recursion" }] },
      { title: "Cabbibo Set", thumb: "assets/cabbiboSet.png", links: [{ label: "Site", url: "http://cabbibo.com/cabbiboSet.html" }] },
      { title: "Julia Set", thumb: "assets/juliaSet.png", links: [{ label: "Site", url: "http://cabbibo.com/juliaSet.html" }] },
      { title: "Mutual Core — Björk (fan site)", thumb: "assets/mutualCore.png", links: [{ label: "Site", url: "http://wom.bs/audioSketches/mutualCore/" }] },
      { title: "Holy Other — We Over (fan site)", thumb: "../img/sites/weOver.png", links: [{ label: "Site", url: "http://wom.bs/audioSketches/weOver/" }] },
      { title: "dannyelfman.com", thumb: "assets/DannyElfman.png", collab: "Danny Elfman", links: [{ label: "Site", url: "https://dannyelfman.com" }] },
    ],
  },

  {
    name: "AR",
    meta: "Augmented Reality",
    items: [
      { title: "ARQUA!", thumb: "assets/arqua.png", collab: "Viacom NEXT", year: "2017", desc: "AR aquarium builder for iOS.", links: [{ label: "Site", url: "https://cabbi.bo/arqua/" }] },
      { title: "Face! Plant!", thumb: "assets/faceplant.png", year: "2019", desc: "AR face-tracking app.", links: [{ label: "Trailer", url: "https://twitter.com/cabbibo/status/1141030277948436485" }] },
      { title: "AR Face Tracking — Facestrument", thumb: "assets/arFaceTracking.jpg", year: "2018", desc: "Playing music with your face.", links: [{ label: "Twitter", url: "https://twitter.com/Cabbibo/status/1017199944363474944" }] },
      { title: "AR with Markers", thumb: "assets/arMarkers.jpg", year: "2018", desc: "Marker-based AR instruments & animations.", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1019722235030908928" }] },
      { title: "Forward Facing AR", year: "2017", desc: "A/V painting, meshing, refraction on iPhone.", links: [{ label: "Twitter", url: "https://twitter.com/Cabbibo/status/900853174575153152" }] },
      { title: "Human Segmentation", thumb: "assets/humanSeg.jpg", year: "2020", desc: "Real-time ML person segmentation effects.", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1232844575363887104" }] },
      { title: "Skull Island", thumb: "assets/skullIsland.jpg", year: "2017", links: [{ label: "Twitter", url: "https://twitter.com/Cabbibo/status/894042349461950464" }] },
      { title: "Shattering Reality", thumb: "assets/shatteringReality.png", year: "2017", links: [{ label: "Twitter", url: "https://twitter.com/Cabbibo/status/900396800816799744" }] },
    ],
  },

  {
    name: "Mixed Reality Hardware",
    meta: "Looking Glass · Magic Leap",
    items: [
      { title: "Looking Glass — Dreams Shader Set", thumb: "assets/lookingGlassDreams.jpg", year: "2019", desc: "WebGL shaders on holographic display.", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1103355179586347008" }] },
      { title: "Looking Glass — WebGL Goo Ball", year: "2019", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1092908849546153984" }] },
      { title: "Magic Leap — Depth Scanner", year: "2018", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1038613210323017728" }] },
      { title: "Magic Leap — In World Sliders", thumb: "assets/magicLeapSliders.jpg", year: "2018", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1041827813962113025" }] },
      { title: "Magic Leap — Catenaries", thumb: "assets/catenaries.jpg", year: "2018", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1039966943887810560" }] },
    ],
  },

  {
    name: "Graphics Experiments",
    meta: "GPU / GLSL / Twitter",
    items: [
      { title: "Responsive Bridge Design", thumb: "assets/responsiveBridgeDesign.png", year: "2018", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1034184124796260353" }] },
      { title: "Painting Density → Mesh", thumb: "assets/paintingDensity.jpg", year: "2018", links: [{ label: "Twitter", url: "https://twitter.com/Cabbibo/status/988196621878886400" }] },
      { title: "Paint Vector Field → Blow", year: "2018", links: [{ label: "Twitter", url: "https://twitter.com/Cabbibo/status/987423544744206336" }] },
      { title: "Arbitrary Caustics", thumb: "assets/caustics.jpg", year: "2018", links: [{ label: "Twitter", url: "https://twitter.com/cabbibo/status/1072223840313298945" }] },
      { title: "3D Fluid Sim with Isosurface", thumb: "assets/fluidSim.jpg", year: "2018", links: [{ label: "Twitter", url: "https://twitter.com/Cabbibo/status/989686836955037696" }] },
    ],
  },

  {
    name: "Films & Shorts",
    meta: "Original",
    items: [
      { title: "Fish Food", thumb: "assets/fishFood.jpg", desc: "Short film.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=XwXcw60UFho" }] },
      { title: "40 Fables: Sun and Wind", thumb: "assets/40fables.jpg", collab: "Kat Ball", desc: "Short film.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=3QHHeAkdvq0" }] },
      { title: "Ripplings — Silver Lake Shorts", thumb: "assets/ripplings.jpg", collab: "Tarpit", desc: "Short film series.", links: [{ label: "TikTok", url: "https://www.tiktok.com/@ripplings" }] },
    ],
  },

  {
    name: "Music Videos",
    meta: "Directing & visuals",
    items: [
      { title: "SOPHIE — FACESHOPPING", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=es9-P1SOeHU" }] },
      { title: "Finn Keane — Careless", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=e7YuB7GKcTM" }] },
      { title: "Hyd — Fallen Angel", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=pvLqb_RM4XI" }] },
      { title: "Halogen Halos — Leah's BF", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=nESQ9wxeBmQ" }] },
      { title: "Pauline Anna Strom — Quiet Joy", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=QsDneC73qmw" }] },
      { title: "Pauline Anna Strom — Cult of Isis", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=YgHat8Ng7mk" }] },
      { title: "Alex Somers — When You Wish Upon A Death Star", links: [{ label: "YouTube", url: "https://youtu.be/BLmkLyfy6bo" }] },
      { title: "Galen Tipton / Diana Starshine — Sensory Bath", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=HzqxExcl1jQ" }] },
    ],
  },

  {
    name: "Visualizers & Concert Visuals",
    meta: "Live & tour",
    items: [
      { title: "Cecile Believe", thumb: "assets/cecileBelieve.png", collab: "tour visuals", links: [{ label: "Drive", url: "https://drive.google.com/drive/folders/1fuiiJVU-0AKH8DKKxWZOPX-sBzOJhnc0" }] },
      { title: "Hyd", thumb: "assets/hyd.jpg", desc: "Tour 1 + 2.", links: [{ label: "Drive", url: "https://drive.google.com/drive/folders/1L8ZLIP9Dxk8GbEHeZWX2Puwr8wjb4Zko" }] },
      { title: "Finn Keane", thumb: "assets/finnKeaneLive.jpg", desc: "Live visuals.", links: [{ label: "Drive", url: "https://drive.google.com/file/d/1zun5BSoTsk0ykiYQxRvsFLO1mIjBsgp3" }] },
      { title: "Frost Children", thumb: "assets/frostChildren.png", desc: "Live visuals.", links: [{ label: "Drive", url: "https://drive.google.com/file/d/1SDd9J0EPFTyG2cWFemD7dYM6nWBcXzol/view" }] },
      { title: "Lil Data", thumb: "assets/lilDataLive.jpg", desc: "Live visuals.", links: [{ label: "Drive", url: "https://drive.google.com/file/d/13KdjOfMhgzRwnNW4nuJ2w_ffH7HF5IqE/view" }] },
      { title: "Fake and Gay", thumb: "assets/fakeAndGay.png", collab: "Adam Kraft", desc: "Club visuals.", links: [{ label: "Drive", url: "https://drive.google.com/drive/folders/1S1lU7QrVSglrndVI3mdjkAT9j8522a9I" }] },
      { title: "SKSKSKS", thumb: "assets/sksksksk.png", collab: "TheLimitDoesNotExist", desc: "Club visuals.", links: [{ label: "Drive", url: "https://drive.google.com/drive/folders/1U5yLcNfIpXWt0yTp5lDOzYijhVMSlhci" }] },
      { title: "Easyfun Viz", thumb: "assets/easyfunViz.png", collab: "Easyfun / Finn Keane / PC Music", links: [{ label: "Drive", url: "https://drive.google.com/drive/folders/1fUoeUmipivlSZsn-zFqGEyNLo4tiq_ac" }] },
      { title: "Makk Mikkeal", thumb: "assets/makk.png", desc: "Visuals.", links: [{ label: "Drive", url: "https://drive.google.com/drive/folders/1C4tEsNqwbTcQhRIlQ8nYMV9WU9eqV-qH" }] },
    ],
  },

  {
    name: "Live Performance — BIB PIT",
    meta: "w/ Tarpit",
    items: [
      { title: "BIB PIT .EXE", thumb: "https://img.itch.zone/aW1nLzEzOTI3NjI3LnBuZw==/original/wpM4k9.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/bib-pit" }] },
      { title: "Bee Two Bee", desc: "Live show.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=LvGUvJTuDhg" }] },
      { title: "Ripplings 2 / Silver Lake Shorts / Spectra", thumb: "assets/ripplings2.png", links: [{ label: "TikTok", url: "https://www.tiktok.com/@ripplings" }] },
      { title: "Lil Data × Cabbibo live", thumb: "https://blog.glitch.com/img/-CbY3rddQT-900.jpeg", desc: "Club Quarantine, 2020 — Charli XCX edits (prod. Dylan Brady & SOPHIE); w/ Namasenda, PC Music.", links: [{ label: "Glitch Blog", url: "https://blog.glitch.com/post/virtual-dance-clubs-are-creating-new-thriving-communities" }] },
    ],
  },

  {
    name: "Widgets",
    items: [
      { title: "CEREBRO", thumb: "https://img.itch.zone/aW1nLzE0NTY1MDM4LnBuZw==/original/M0ZSC1.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/cerebro" }] },
      { title: "Goo Ball V1", thumb: "https://img.itch.zone/aW1nLzE0NTczNzE3LnBuZw==/original/N6je9l.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/goo-ball-v1" }] },
    ],
  },

  {
    name: "Tools & Asset Packs",
    meta: "itch.io",
    items: [
      { title: "Toon Sketch Shader Pack", thumb: "https://img.itch.zone/aW1nLzUyOTc5OTIucG5n/original/k4eX2V.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/toon-sketch-shader-pack" }] },
      { title: "Fantasy Light", thumb: "https://img.itch.zone/aW1nLzUwMzA2ODUuanBn/original/1lb79P.jpg", links: [{ label: "itch", url: "https://cabbibo.itch.io/fantasy-light" }] },
      { title: "Fantasy Crystals", thumb: "https://img.itch.zone/aW1nLzQ5NjY5ODIucG5n/original/bWVZ3F.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/fantasy-crystals" }] },
      { title: "Fantasy Tree", thumb: "https://img.itch.zone/aW1nLzQ5OTc5NTIuanBn/original/mPBWEM.jpg", links: [{ label: "itch", url: "https://cabbibo.itch.io/fantasy-tree" }] },
      { title: "Magic Curve", thumb: "https://img.itch.zone/aW1nLzUzMDQyOTcuanBn/original/nIZffl.jpg", links: [{ label: "itch", url: "https://cabbibo.itch.io/magic-curve" }] },
      { title: "Skinned Mesh Particle Emitter", thumb: "https://img.itch.zone/aW1nLzUxNDAxNTEuanBn/original/YvjVUS.jpg", links: [{ label: "itch", url: "https://cabbibo.itch.io/skinned-mesh-particle-emitter" }] },
      { title: "Moon Ball", thumb: "https://img.itch.zone/aW1nLzE4NzU1NjEucG5n/original/clUZqt.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/moon-ball" }] },
      { title: "CEREBRO", thumb: "https://img.itch.zone/aW1nLzE0NTY1MDM4LnBuZw==/original/M0ZSC1.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/cerebro" }] },
      { title: "Goo Ball V1", thumb: "https://img.itch.zone/aW1nLzE0NTczNzE3LnBuZw==/original/N6je9l.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/goo-ball-v1" }] },
      { title: "blarp2D", thumb: "https://img.itch.zone/aW1nLzE0OTM3NDk1LnBuZw==/original/ShWuGC.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/blarp2d" }] },
      { title: "Cabbibos Play Pack", thumb: "https://img.itch.zone/aW1hZ2UvMjk4NTQzLzE0NjA0MjgucG5n/original/h0t6hr.png", links: [{ label: "itch", url: "https://cabbibo.itch.io/play-pack" }] },
    ],
  },

  {
    name: "Open Source",
    meta: "GitHub · 269 repos",
    items: [
      { title: "PhysicsRenderer", thumb: "../img/sites/physicsRenderer.png", desc: "three.js GPGPU utils — 221★", links: [{ label: "GitHub", url: "https://github.com/cabbibo/PhysicsRenderer" }] },
      { title: "glsl-curl-noise", desc: "155★", links: [{ label: "GitHub", url: "https://github.com/cabbibo/glsl-curl-noise" }] },
      { title: "enough", thumb: "../img/sites/enough.png", desc: "127★", links: [{ label: "GitHub", url: "https://github.com/cabbibo/enough" }] },
      { title: "IMMATERIA", desc: "Unity compute shader library — 126★", links: [{ label: "GitHub", url: "https://github.com/cabbibo/IMMATERIA" }] },
      { title: "Text", desc: "three.js text — 123★", links: [{ label: "GitHub", url: "https://github.com/cabbibo/Text" }] },
      { title: "ShaderLoader", thumb: "../img/sites/ShaderLoader.png", links: [{ label: "Demo", url: "https://cabbi.bo/ShaderLoader/" }] },
      { title: "FloatyText", links: [{ label: "GitHub", url: "https://github.com/cabbibo/floatyText" }] },
    ],
  },

  {
    name: "Patents",
    meta: "Leap Motion, Inc.",
    items: [
      { title: "Velocity Field Interaction for Free-Space Gesture Interface and Control", thumb: "assets/velocityFieldInteraction.png", collab: "David S. Holz, Maxwell Sills", links: [{ label: "Justia", url: "https://patents.justia.com/patent/20250383719" }] },
      { title: "User-Defined Virtual Interaction Space and Manipulation of Virtual Configuration", thumb: "assets/userDefinedVirtualInteractionSpace.png", collab: "Maxwell Sills", links: [{ label: "Justia", url: "https://patents.justia.com/patent/20250355506" }] },
      { title: "User-Defined Virtual Interaction Space and Manipulation of Virtual Cameras", collab: "Maxwell Sills", links: [{ label: "Justia", url: "https://patents.justia.com/patent/10275039" }] },
    ],
  },

  {
    name: "Shadertoy",
    meta: "Real-time fragment shaders",
    items: [
      { title: "SDF Tutorial 1: box & balloon", thumb: "assets/boxAndBallonShadertoy.png", desc: "~16K views.", links: [{ label: "shadertoy", url: "https://www.shadertoy.com/view/Xl2XWt" }] },
      { title: "impact", thumb: "assets/impact.png", collab: "Luke XI", links: [{ label: "shadertoy", url: "https://www.shadertoy.com/view/ltj3zR" }] },
      { title: "Sanctuary", thumb: "assets/sanctuary.png", links: [{ label: "shadertoy", url: "https://www.shadertoy.com/view/ls33WH" }] },
      { title: "prism: light becoming", thumb: "assets/prismLightBecoming.png", collab: "Connor Bell, jonny script", links: [{ label: "shadertoy", url: "https://www.shadertoy.com/view/Xs3XRj" }] },
      { title: "Connor Collab 1", thumb: "assets/connorCollab1.png", links: [{ label: "shadertoy", url: "https://www.shadertoy.com/view/lstXD7" }] },
      { title: "Connor Collab 2", thumb: "assets/connorCollab2.png", links: [{ label: "shadertoy", url: "https://www.shadertoy.com/view/4sdXRB" }] },
      { title: "Shade-a-Day series", thumb: "assets/shadeADay.png", links: [{ label: "shadertoy", url: "https://www.shadertoy.com/view/4llGDB" }] },
    ],
  },

  {
    name: "Writing & Talks",
    meta: "Essays · Lectures",
    items: [
      { title: "The Anatomy of a Jellyfish", thumb: "assets/jellyfish.png", links: [{ label: "Medium", url: "https://medium.com/@isaaclandoncohen/the-anatomy-of-a-jellyfish-5fa9337fcd92" }] },
      { title: "10 Quick Things I've Learned in VR", thumb: "assets/10quickThings.jpg", links: [{ label: "Drive", url: "https://docs.google.com/document/d/1-UYCZcxKDmy5BF_-IXg1KDtwShJ5imNOch5xGPXzPr0/edit" }] },
      { title: "Games: A Primer for VR", thumb: "assets/gamesAPrimer.jpg", links: [{ label: "Drive", url: "https://docs.google.com/document/d/17Xl-g6PEnVs5fCkwfc2a9_EcQkXCKz-zWdWIgo3cS0M/edit" }] },
      { title: "Math, Nature and Thievery", desc: "SFHTML5 talk.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=TKHqoZYFEYQ" }] },
      { title: "Discovering our Prismatic Reality", thumb: "assets/prismaticReality.jpg", desc: "JS.LA talk.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=efcL6yv4DBg" }] },
      { title: "Finding (and Making) Your Happy Place", desc: "Google.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=op6uYO_HxIU" }] },
      { title: "From Objects to Scenes to Stories", desc: "An Exploration in the Dimensionality of Craft. VRLA.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=bGe6ZQDJ9w4" }] },
      { title: "ENOUGH — An Interactive Storybook", year: "2015", desc: "NVScene rough-draft talk.", links: [{ label: "YouTube", url: "https://www.youtube.com/watch?v=Khnccysg-4I" }] },
      { title: "Dynamicland at Eyeo", thumb: "assets/eyeo.png", year: "2018", desc: "Dynamicland presentation at the Eyeo Festival.", links: [{ label: "Dynamicland", url: "https://dynamicland.org/2018/Dynamicland_at_Eyeo/" }] },
      // TODO: add direct links when you have them
      { title: "Real Time is Now", year: "2014", desc: "SIGGRAPH 2014 Computer Animation Festival — Real Time Live!", links: [{ label: "ACM", url: "https://doi.org/10.1145/2633956.2658829" }] },
      { title: "Experimental Gameplay Workshop (EGW)", thumb: "assets/egw.jpg", year: "2017", desc: "GDC.", links: [{ label: "YouTube", url: "https://youtu.be/Y4cCCgOXcNU?t=1971" }] },
      { title: "Experimental Games Showcase (ExGS)", desc: "GDC. Showcase + Demos sessions.", links: [{ label: "GDC Schedule", url: "https://schedule.gdconf.com/speaker/cohen-isaac/45022" }] },
      { title: "Art and VR at Sotheby's", thumb: "assets/artAndVrAtSothebys.png", links: [{ label: "Sotheby's", url: "https://www.sothebys.com/en/videos/vr-society-presents-the-art-of-vr-at-sothebys" }] },
      { title: "AWE XR speaker", thumb: "https://i.imgur.com/zZoYJaG.png", year: "2020", links: [{ label: "Speaker page", url: "https://www.awexr.com/global/speaker/2153-isaac-cohen" }] },
    ],
  },

  {
    name: "Residencies & Features",
    meta: "Commissions · Programs",
    items: [
      { title: "Unity — VR Artist in Residence", thumb: "assets/unityAir.png", links: [{ label: "Medium", url: "https://tonyparisi.medium.com/blurred-lines-e9f8531c06b" }] },
      { title: "Adobe — AR Residency", thumb: "assets/adobeARResidency.png", links: [{ label: "Blog", url: "https://business.adobe.com/blog/the-latest/how-ar-artists-in-residence-are-shaping-project-aero" }] },
      { title: "Google — Tilt Brush Artist in Residence", thumb: "assets/googleTiltBrush.png", links: [{ label: "Google Blog", url: "https://blog.google/products-and-platforms/products/google-ar-vr/tilt-brush-air-isaac-cohen/" }] },
      { title: "Dynamicland", thumb: "https://dynamicland.org/2024/Front_shelf/8c7c199d7fe30d0b695537dcb6d7a702.jpg", desc: "Volunteer / resident / collaborator.", links: [{ label: "Dynamicland", url: "https://dynamicland.org/" }] },
      { title: "Viacom NEXT", thumb: "assets/viacomNext.png", links: [{ label: "Wikipedia", url: "https://en.wikipedia.org/wiki/Viacom_NEXT" }] },
    ],
  },

  {
    name: "Awards & Honors",
    meta: "Selections · Awards · Nominations",
    items: [
      { title: "ENOUGH — FWA Site of the Day", thumb: "../img/sites/enough.png", links: [{ label: "FWA", url: "http://www.thefwa.com/site/enough" }] },
      { title: "ENOUGH — FWA Site of the Month", thumb: "../img/sites/enough.png", links: [{ label: "FWA", url: "http://www.thefwa.com/article/insights-enough" }] },
      { title: "ENOUGH — Adobe Cutting Edge Award", thumb: "../img/sites/enough.png", links: [{ label: "Adobe", url: "http://www.thefwa.com/adobe/tcea/enough" }] },
      { title: "ENOUGH — IGF Nuovo Award Honorable Mention", thumb: "../img/sites/enough.png", links: [{ label: "IGF", url: "http://www.igf.com/02finalists.html" }] },
      { title: "ENOUGH — AWWWARDS Site of the Year Nomination", thumb: "../img/sites/enough.png", year: "2015", links: [{ label: "AWWWARDS", url: "http://www.awwwards.com/annual-awards-2015/experimental-innovative-site-of-the-year" }] },
      { title: "Cabbibo.com — FWA Site of the Day", thumb: "../img/sites/cabbibo.png", links: [{ label: "FWA", url: "http://www.thefwa.com/site/cabbibo" }] },
      { title: "Float Museum — Official Selection, SFMoMA", thumb: "assets/floatMuseumSFMOMA.png", links: [{ label: "SFMoMA", url: "https://www.sfmoma.org/event/playsfmoma-mixed-reality-pop-arcade/" }] },
      { title: "L U N E — Official Selection, Teknopolis", thumb: "../img/sites/lune.png", year: "2019", links: [{ label: "BAM", url: "https://www.bam.org/media/15362258/Teknopolis-2019-final.pdf" }] },
      { title: "H E N G E — Official Selection, MUTEK", thumb: "https://img.youtube.com/vi/1pE19vchlRA/mqdefault.jpg", links: [{ label: "MUTEK", url: "https://nexus.mutek.us/" }] },
    ],
  },

  {
    name: "Pitches / In Development",
    meta: "Current proposals",
    items: [
      { title: "BE A BIRD", thumb: "assets/beABird.jpg", collab: "Wesley Allsbrook", desc: "Flight game with biome-driven flocks.", links: [{ label: "Pitch", url: "https://docs.google.com/presentation/d/18Bt_ZrLiMo14u-g4-2BgW09lhH5Ed2GXsU1q6O9C528/edit?usp=sharing" }] },
      { title: "IM ‖ MATERIA", thumb: "assets/immatPitch.jpg", desc: "Ongoing audiovisual picturebook about digital creatures.", links: [{ label: "Pitch", url: "https://docs.google.com/presentation/d/1J-2gWza_RmFBFSw2fgHAVYXqJkMzeP5WxpUclhRfs8o/edit?usp=drive_link" }] },
      { title: "BLORP!", thumb: "assets/blorpPitch.jpg", desc: "In pitch.", links: [{ label: "Pitch", url: "https://docs.google.com/presentation/d/1OVAcz8pmbEiwf1u66BsZeGrE1B9AW6cWTK6cqoA8CAQ/edit?usp=drive_link" }] },
      { title: "A.V.V. / AVDJ", thumb: "assets/avv.jpg", desc: "Audiovisual DJ tool — pitch deck in progress.", links: [{ label: "Pitch", url: "https://docs.google.com/presentation/d/14kKdfzCyY3Vg-hau1CPvZDbpttbwGuIiZneeyeWlKvY/edit?usp=sharing" }] },
      { title: "Snow Angel", thumb: "assets/snowAngel.jpg", desc: "Unfinished; content on Instagram.", links: [{ label: "Pitch", url: "https://docs.google.com/presentation/d/1Si4Fv41_hz56zHS51CBRqPDeyRsKm6z4K_AaWouAu90/edit?usp=drive_link" }] },
    ],
  },
];

// ------------------------------------------------------------
// PRESS
// ------------------------------------------------------------

const PRESS = [
  { outlet: "Flux Podcast", title: "Isaac Cohen: An XR Trailblazer on How to Build Humane Technology", thumb: "https://cdn-images-1.medium.com/max/700/1*uAD61Tp867rzl3mPdOgJQQ.png", links: [{ label: "Listen", url: "https://thefluxpodcast.medium.com/22-isaac-cohen-an-xr-trailblazer-on-how-to-build-humane-technology-cada62552d0b" }] },
  { outlet: "Voices of VR #336", title: "Surreal Experimental Art & BLARP!", thumb: "assets/press/voicesvr336.jpg", links: [{ label: "Listen", url: "https://voicesofvr.com/336-surreal-experimental-art-blarps-unique-physics-based-game-mechanic/" }] },
  { outlet: "Voices of VR #512", title: "Experiential Poems: Emotions & Embodied Vulnerability", thumb: "https://roadtovrlive-5ea0.kxcdn.com/wp-content/uploads/2017/03/cabbibo2.jpeg", links: [{ label: "Listen", url: "http://voicesofvr.com/512-experiential-poems-exploring-emotions-embodied-vulnerability-with-cabbibo/" }] },
  { outlet: "Voices of VR #579", title: "Using AR to Recontextualize Our Relationship to Reality (ARQUA!)", thumb: "assets/press/voicesvr579.jpg", links: [{ label: "Listen", url: "https://voicesofvr.com/579-using-ar-to-recontextualize-our-relationship-to-reality-with-cabibbos-arqua/" }] },
  { outlet: "Rock Paper Shotgun", title: "The Shimmering Worlds of Isaac Cohen", thumb: "assets/press/rps.jpg", links: [{ label: "Read", url: "https://www.rockpapershotgun.com/isaac-cohen-vr-work" }] },
  { outlet: "Polygon", title: "Blarp is the weirdest game for the HTC Vive", thumb: "assets/press/polygon.jpg", links: [{ label: "Read", url: "https://www.polygon.com/2016/4/7/11379988/blarp-overview" }] },
  { outlet: "The Next Web", title: "This amazing interactive picture book…", links: [{ label: "Read", url: "https://thenextweb.com/news/this-amazing-interactive-picture-book-for-the-web-makes-me-jealous-of-kids-these-days" }] },
  { outlet: "The FWA", title: "Interview", thumb: "assets/fwaInterview.png", links: [{ label: "Read", url: "https://thefwa.com/interviews/issac-cohen" }] },
  { outlet: "MOR", title: "Spotlight: Isaac Cohen and the Telescope for the Mind", thumb: "assets/MOR.png", links: [{ label: "Read", url: "https://www.museumor.com/blog/spotlight-isaac-cohen-and-the-telescope-for-the-mind" }] },
  { outlet: "Boing Boing", title: "Lose yourself in this trippy, existential interactive playbook", thumb: "assets/press/boingboing.jpg", links: [{ label: "Read", url: "https://boingboing.net/2015/07/21/lose-yourself-in-this-trippy.html" }] },
  { outlet: "VICE / Thump", title: "This is What Pong Would Be Like in VR", thumb: "assets/press/vicethump.jpg", links: [{ label: "Read", url: "https://www.vice.com/en/article/jpv98d/this-is-what-pong-would-be-like-in-vr" }] },
  { outlet: "VICE", title: "I Used Leap Motion to Touch a Virtual Rainbow Universe", thumb: "assets/press/viceleap.gif", links: [{ label: "Read", url: "https://www.vice.com/en/article/pgqky7/i-used-leap-motion-to-touch-a-virtual-rainbow-universe" }] },
  { outlet: "VICE", title: "Dive Into a Deep-Sea Digital Picture Book", thumb: "assets/press/vicesea.jpg", links: [{ label: "Read", url: "https://www.vice.com/en/article/ez5b9k/dive-into-a-deep-sea-digital-picture-book" }] },
  { outlet: "Kill Screen / VERSIONS", title: "What is the texture of VR?", links: [{ label: "Read", url: "https://killscreen.com/versions/what-is-the-texture-of-vr/" }] },
  { outlet: "Ultranoir", title: "A Journey with Cabbibo, Creator of Enough", links: [{ label: "Read", url: "http://z.ultranoir.com/en/articles/1270-a-journey-with-cabbibo-creator-of-enough.html" }] },
  { outlet: "American Cinematographer", title: "Exploring Spatial Reality at Ayzenburg", thumb: "assets/press/asc.jpg", links: [{ label: "Read", url: "https://theasc.com/articles/spatial-reality-at-ayzenburg" }] },
  { outlet: "LBBOnline", title: "Tool Hosts VR Showcase Featuring 'My Lil' Donut'", thumb: "assets/toolHosts.png", links: [{ label: "Read", url: "https://www.lbbonline.com/news/tool-hosts-vr-showcase-featuring-my-lil-donut" }] },
];

// ------------------------------------------------------------
// CONTACT
// ------------------------------------------------------------

const CONTACT_LINKS = [
  { label: "cabbi.bo",     url: "https://cabbi.bo/" },
  { label: "cabbibo.com",  url: "https://cabbibo.com" },
  { label: "GitHub",       url: "https://github.com/cabbibo" },
  { label: "Instagram",    url: "https://www.instagram.com/cabbibo/" },
  { label: "Threads",      url: "https://www.threads.net/@cabbibo" },
  { label: "TikTok",       url: "https://www.tiktok.com/@cabbibo" },
  { label: "Twitter / X",  url: "https://twitter.com/cabbibo" },
  { label: "itch.io",      url: "https://cabbibo.itch.io" },
  { label: "Patreon",      url: "https://www.patreon.com/cabbibo" },
  { label: "Shadertoy",    url: "https://www.shadertoy.com/user/cabbibo" },
  { label: "SoundCloud",   url: "https://soundcloud.com/cabbibo" },
  { label: "Vimeo",        url: "https://vimeo.com/cabbibo" },
  { label: "YouTube",      url: "https://www.youtube.com/channel/UCKqO1GCq6Ni1qZvv2ysIt8w" },
  { label: "Medium",       url: "https://medium.com/@isaaclandoncohen" },
];

// ------------------------------------------------------------
// RENDER
// ------------------------------------------------------------

function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") node.className = v;
    else if (k === "html") node.innerHTML = v;
    else node.setAttribute(k, v);
  }
  for (const child of [].concat(children)) {
    if (child == null) continue;
    node.appendChild(typeof child === "string" ? document.createTextNode(child) : child);
  }
  return node;
}

// ------------------------------------------------------------
// THUMBNAIL DERIVATION
// Given a list of links, return the first URL we can derive a
// thumbnail from. Currently handles YouTube, Steam, GitHub OG.
// Falls back to null → gradient placeholder.
// ------------------------------------------------------------

function deriveThumb(links) {
  if (!links || !links.length) return null;
  for (const l of links) {
    const u = l.url;

    // YouTube — watch?v=ID or youtu.be/ID
    let m = u.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/);
    if (m) return `https://img.youtube.com/vi/${m[1]}/mqdefault.jpg`;

    // Steam — /app/ID/
    m = u.match(/store\.steampowered\.com\/app\/(\d+)/);
    if (m) return `https://cdn.akamai.steamstatic.com/steam/apps/${m[1]}/header.jpg`;

    // GitHub — /OWNER/REPO (not user pages or query strings)
    m = u.match(/^https?:\/\/github\.com\/([^\/\?]+)\/([^\/\?#]+)\/?$/);
    if (m && m[2] !== "tab=repositories") return `https://opengraph.githubassets.com/1/${m[1]}/${m[2]}`;

    // Vimeo — vimeo.com/ID (uses vumbnail.com proxy)
    m = u.match(/vimeo\.com\/(\d+)/);
    if (m) return `https://vumbnail.com/${m[1]}.jpg`;
  }
  return null;
}

// Stable color seed from title — gives each placeholder a unique hue.
function hueFromString(s) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 360;
}

function renderWorkItem(item) {
  const hasLinks = item.links && item.links.length > 0;

  // ---- Thumb ----
  // Priority: explicit `thumb` field (local file) > derived from links > gradient fallback.
  const thumb = el("div", { class: "work-item-thumb" });
  const thumbUrl = item.thumb || deriveThumb(item.links);
  const hue = hueFromString(item.title);
  thumb.style.setProperty("--h", hue);
  if (thumbUrl) {
    const img = el("img", {
      src: thumbUrl,
      alt: `${item.title} thumbnail`,
      loading: "lazy",
      decoding: "async",
    });
    img.addEventListener("error", () => {
      img.remove();
      thumb.classList.add("is-fallback");
    });
    thumb.appendChild(img);
  } else {
    thumb.classList.add("is-fallback");
  }

  // ---- Title ----
  let titleEl;
  if (hasLinks && item.links.length === 1) {
    const a = el("a", { href: item.links[0].url, target: "_blank", rel: "noopener" }, item.title);
    titleEl = el("h4", { class: "work-item-title" }, a);
  } else if (hasLinks) {
    titleEl = el("h4", { class: "work-item-title" }, item.title);
  } else {
    titleEl = el("h4", { class: "work-item-title is-textonly" }, item.title);
  }

  // ---- Meta (year + collab) ----
  const metaParts = [];
  if (item.collab) metaParts.push(`w/ ${item.collab}`);
  if (item.year) metaParts.push(item.year);
  const metaEl = el("div", { class: "work-item-meta" }, metaParts.join(" · "));

  // ---- Body (title + desc + links) ----
  const body = el("div", { class: "work-item-body" }, [titleEl]);
  if (item.desc) body.appendChild(el("p", { class: "work-item-desc" }, item.desc));
  if (hasLinks && item.links.length > 1) {
    const linksRow = el("div", { class: "work-item-links" });
    item.links.forEach((l) => {
      linksRow.appendChild(el("a", { href: l.url, target: "_blank", rel: "noopener" }, l.label));
    });
    body.appendChild(linksRow);
  }

  return el("li", { class: "work-item" }, [thumb, body, metaEl]);
}

function renderCategory(cat) {
  const header = el("div", { class: "category-header" }, [
    el("h3", { class: "category-name" }, cat.name),
    el("div", { class: "category-meta" }, cat.meta || ""),
  ]);
  const list = el("ul", { class: "category-items" });
  cat.items.forEach((item) => list.appendChild(renderWorkItem(item)));
  return el("section", { class: "category", id: `cat-${cat.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` }, [header, list]);
}

function renderPressItem(p) {
  const url = p.links && p.links[0] ? p.links[0].url : null;
  const thumbUrl = p.thumb || deriveThumb(p.links);
  const thumb = el("div", { class: "press-thumb" });
  thumb.style.setProperty("--h", hueFromString(p.outlet + p.title));
  if (thumbUrl) {
    const img = el("img", { src: thumbUrl, alt: `${p.outlet} thumbnail`, loading: "lazy", decoding: "async" });
    img.addEventListener("error", () => { img.remove(); thumb.classList.add("is-fallback"); });
    thumb.appendChild(img);
  } else {
    thumb.classList.add("is-fallback");
  }

  const body = el("div", { class: "press-body" }, [
    el("div", { class: "press-outlet" }, p.outlet),
    el("p", { class: "press-title" }, p.title),
  ]);

  const inner = el("div", { class: "press-inner" }, [thumb, body]);
  if (url) {
    const link = el("a", { href: url, target: "_blank", rel: "noopener", class: "press-link" }, inner);
    return el("li", { class: "press-item" }, link);
  }
  return el("li", { class: "press-item" }, inner);
}

function renderContactLink(c) {
  return el("li", {}, el("a", { href: c.url, target: "_blank", rel: "noopener" }, c.label));
}

// ------------------------------------------------------------
// BOOTSTRAP
// ------------------------------------------------------------

document.addEventListener("DOMContentLoaded", () => {
  // year
  document.getElementById("year").textContent = new Date().getFullYear();

  // work categories
  const workRoot = document.getElementById("work-categories");
  CATEGORIES.forEach((cat) => workRoot.appendChild(renderCategory(cat)));

  // press
  const pressRoot = document.getElementById("press-list");
  PRESS.forEach((p) => pressRoot.appendChild(renderPressItem(p)));

  // contact
  const contactRoot = document.getElementById("contact-links");
  CONTACT_LINKS.forEach((c) => contactRoot.appendChild(renderContactLink(c)));

  // mobile nav toggle
  const toggle = document.querySelector(".nav-toggle");
  const links = document.getElementById("nav-links");
  toggle.addEventListener("click", () => {
    const open = links.classList.toggle("open");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
  });
  // close menu when a link is clicked
  links.querySelectorAll("a").forEach((a) => {
    a.addEventListener("click", () => {
      links.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
});
