s.Bot = new Class( {
  toString: 'Bot',
  extend: s.Ship,

  construct: function( options ) {
    var position = options.position || [22498, -25902, 24976];
    var rotation = options.rotation || [0, Math.PI / 2, 0];

    // Generating a new bot with properties
    this.name = options.name || 'bot ' + (++this.game.botCount);
    this.isBot = true;
    
    this.botOptions = {
      rotationSpeed: Math.PI/2,
      pitchSpeed: Math.PI/4,
      yawSpeed: Math.PI/4,
      thrustImpulse: 0,
      brakePower: 0.85,
      velocityFadeFactor: 16,
      rotationFadeFactor: 4
    };

    this.targetX = 0;
    this.targetY = 0;


    //set a hook on the bot controls.
    //unhook is necessary because first player has bot join twice
    this.controlBot = this.controlBot.bind(this);
    if (this.game.lastBotCallback) {
      this.game.unhook( this.game.lastBotCallback );
    }

    this.game.hook( this.controlBot );
    this.game.lastBotCallback = this.controlBot;

    this.lastTime = new Date( ).getTime( );

    //initialize s.Ship
    this.initialize({
      shipClass: options.shipClass,
      position: new THREE.Vector3( position[ 0 ], position[ 1 ], position[ 2 ] ),
      rotation: new THREE.Vector3( rotation[ 0 ], rotation[ 1 ], rotation[ 2 ] ),
      alliance: options.alliance
    });


    //CAMERA SETUP COMES AFER INITALIZE SO ROOT IS ALREADY SET UP
    //Create a camera for the bot
    this.camera = new THREE.PerspectiveCamera(35, 1, 1, 300000);

    // Root camera to the bot's position
    this.root.add( this.camera );

    // Setup camera: Cockpit view; COMMENT OUT FOR CHASE CAM
    this.camera.position.set( 0, 0, 0 );
  },

  getEnemyList: function () {
    this.botEnemyList = [];
    this.botEnemyList.push(this.game.player);
    var enemyShips = this.game.enemies._list;
    for (var i = 0; i < enemyShips.length; i++) {
      if (!enemyShips[i].isBot) {
        this.botEnemyList.push(enemyShips[i]);
      }
    }
  },

  getClosestDistance: function () {
    this.closestDistance = null;
    for (i = 0; i < this.botEnemyList.length; i++) {
      var distance = this.root.position.distanceTo(this.botEnemyList[i].root.position);
      if (!this.closestDistance || distance < this.closestDistance) {
        this.closestDistance = distance;
        this.target = this.botEnemyList[i];
      }
    }
  },


  controlBot: function( ) {

    //get closest enemy
    this.getEnemyList();
    this.getClosestDistance();

    //////////////////////////////
    //// THRUST/BREAK LOGIC ////
    //////////////////////////////    

    var now = new Date( ).getTime( );
    var difference = now - this.lastTime;

    var thrust = 0;
    var brakes = 0;

    var  maxDistance = 4100, minDistance = 1500;

    if (this.closestDistance > maxDistance) {
      thrust = 1;
    }
    else if (this.closestDistance < minDistance) {
      brakes = 1;
    } else {
      var ratio = (this.closestDistance - minDistance) / (maxDistance - minDistance);
      var optimumSpeed = s.config.ship.maxSpeed * ratio;
      if (optimumSpeed < this.botOptions.thrustImpulse) { brakes = 1; }
      if (optimumSpeed > this.botOptions.thrustImpulse) { thrust = 1; }
    }

    if (thrust && this.botOptions.thrustImpulse < s.config.ship.maxSpeed){
      this.botOptions.thrustImpulse += difference;
    }

    if (brakes && this.botOptions.thrustImpulse > 0){
      this.botOptions.thrustImpulse -= difference;
    }


    //////////////////////////////
    // LEFT/RIGHT/UP/DOWN LOGIC //
    //////////////////////////////       

    var vTarget3D;
    var vTarget2D;

    var pitch = 0;
    var roll = 0;
    var yaw = 0;

    var yawSpeed    = this.botOptions.yawSpeed,
    pitchSpeed  = this.botOptions.pitchSpeed;

    var thrustScalar = this.botOptions.thrustImpulse/s.config.ship.maxSpeed + 1;

    // TARGET HUD MARKING
    if ( this.target ) {
      this.target = this.target.root;

      vTarget3D = this.target.position.clone();
      vTarget2D = s.projector.projectVector(vTarget3D, this.camera);
    }

    if (vTarget2D.z < 1) {
        //go left; else if go right
        if (vTarget2D.x < -0.15) {
          yaw = yawSpeed / thrustScalar;
        } else if (vTarget2D.x > 0.15) {
          yaw = -1 * yawSpeed / thrustScalar;
        }
        //do down; else if go up
        if (vTarget2D.y < -0.15) {
          pitch = -1*pitchSpeed / thrustScalar;
        } else if (vTarget2D.y > 0.15) {
          pitch  = pitchSpeed / thrustScalar;
        }
      } else {
        //go right; else if go left
        if (vTarget2D.x < 0) {
          yaw = -1* yawSpeed / thrustScalar;
        } else if (vTarget2D.x >= 0) {
          yaw = yawSpeed / thrustScalar;
        }
        //do up; else if go down
        if (vTarget2D.y < 0) {
          pitch = pitchSpeed / thrustScalar;
        } else if (vTarget2D.y > 0) {
          pitch  = -1 * pitchSpeed / thrustScalar;
        }
      }

    //////////////////////////////
    // MOTION AND PHYSICS LOGIC //
    //////////////////////////////


    var linearVelocity = this.root.getLinearVelocity().clone();
    var angularVelocity = this.root.getAngularVelocity().clone();
    var rotationMatrix = new THREE.Matrix4();
    rotationMatrix.extractRotation(this.root.matrix);

    angularVelocity = angularVelocity.clone().divideScalar(this.botOptions.rotationFadeFactor);
    this.root.setAngularVelocity(angularVelocity);

    var newAngularVelocity = new THREE.Vector3(pitch, yaw, roll).applyMatrix4(rotationMatrix).add(angularVelocity);
    this.root.setAngularVelocity(newAngularVelocity);

    var impulse = linearVelocity.clone().negate();
    this.root.applyCentralImpulse(impulse);

    var getForceVector = new THREE.Vector3(0,0, -1*this.botOptions.thrustImpulse).applyMatrix4(rotationMatrix);
    this.root.applyCentralImpulse(getForceVector);

    this.lastTime = now;

    //////////////////////////////
    ///////  FIRING LOGIC ////////
    //////////////////////////////

    if ( Math.abs(vTarget2D.x) <= 0.15 && Math.abs(vTarget2D.y) <= 0.15 && vTarget2D.z < 1 && this.closestDistance < maxDistance) {
      this.fire('turret');
    }

  }

} );