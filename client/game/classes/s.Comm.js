/**
*
* s.Comm is responsible for alerting the server things that happen to a player (via emit events that the server is lisenting for)
*
*
**/

s.Comm = new Class( {

    extend: s.EventEmitter,


    toString: "Comm",


    // makeTrigger is responsible for broadcasting all events

    // receieved from the server to the rest of the game.


    makeTrigger: function ( evt ) {

        var that = this;

        return function ( message ) {

            that.trigger.call( that, evt, message );

        };

    },


    destruct: function ( ) {

        // TODO: Send server some kind of destruct message?

    },


    construct: function ( options ) {
        this.options = options;        
        options = jQuery.extend( {
            server: 'localhost:1935'
        }, options );

        // Prepend http
        this.options.server = 'http://' + this.options.server;

        this.player = this.options.player;
        this.ship = options.ship;

        this.pilot = options.pilot;

        var that = this;


        this.lastMessageTime = new Date( ).getTime( );

        // Create socket connection


        this.socket = io.connect( options.server );


        this.socket.on( 'join', this.makeTrigger( 'join' ) );

        this.socket.on( 'failed', function ( message ) {
            // try to reconnect
            that.connected( );
        } );

        this.socket.on( 'player list', this.makeTrigger( 'player list' ) );

        this.socket.on( 'leave', this.makeTrigger( 'leave' ) );

        this.socket.on( 'move', this.makeTrigger( 'move' ) );

        this.socket.on('killed', this.makeTrigger( 'killed' ));

        this.socket.on('fire', this.makeTrigger( 'fire' ));

        this.socket.on('hit', this.makeTrigger( 'hit' ));


        this.game.hook( this.position );

        this.clockTick = this.clockTick.bind(this);

        this.timer = setInterval(this.clockTick,1000);

        this.time = 0;


        // this.bind( this.position );
        // this.bind( this.fire );
        // this.bind( this.died );
        // this.bind( this.hit );
    },

    connected: function ( ) {


        var time = new Date( ).getTime( );


        var shipPosition = this.game.player.getPositionPacket( );

        var packet = {

            evt: 'joined',

            name: this.pilot.name,

            time: time,

            pos: shipPosition.pos,

            rot: shipPosition.rot,

            aVeloc: shipPosition.aVeloc,

            lVeloc: shipPosition.lVeloc

        };


        // Broadcast position

        this.socket.emit( 'join', packet );

    },


    position: function ( ) {

        var time = new Date( ).getTime( );


        // Never send faster than server can handle

        if ( time - s.game.comm.lastMessageTime >= 15 ) {

            var shipPosition = s.game.player.getPositionPacket( );

            // TODO: Figure out if ship or turret actually moved
            

            // If ship moved, send packet
            
            if ( this.lastPosition !== shipPosition.pos ) {

                // Build packet

                this.time = 0;

                var packet = {

                    time: time,

                    pos: shipPosition.pos,

                    rot: shipPosition.rot,

                    aVeloc: shipPosition.aVeloc,

                    lVeloc: shipPosition.lVeloc

                };

                // Broadcast position


                s.game.comm.socket.emit( 'move', packet );

                s.game.comm.lastMessageTime = time;

                this.lastPosition = shipPosition.pos;

            }
        }
    },


    fire: function( pos, rot, velocity ) {

        this.time = 0;

        this.socket.emit( 'fire', {

            position: pos,

            rotation: rot,

            initialVelocity: velocity

        });
    },


    died: function( you, killer ) {

        this.socket.emit( 'killed',{

            you: you,

            killer: killer

             });

    },


    hit: function( otherPlayerName, yourName ) {

        this.time = 0;

        this.socket.emit( 'hit', {

            otherPlayerName: otherPlayerName,

            yourName: yourName

        });
    },

    clockTick: function( ){
        this.time += 1;
        // if ( this.time >= 60 ){
        //     window.location.href = "http://satellite-game.com";
        // }
    }
} );
