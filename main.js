window.addEventListener("load", function() {

var Q = window.Q = Quintus({audioSupported: ['mp3','ogg','wav']}) 
        .include("Sprites, Scenes, Input, 2D, Anim, Touch, UI, TMX, Audio, IsoTileLayer")
        .setup({ development: true, maximize:true})
        .touch().controls(true)
        .enableSound();

//It's good to know the tileH for future calculations
Q.tileH = 32;
Q.gravityY = 0;

Q.SPRITE_NONE = 0;
Q.SPRITE_DEFAULT = 1;
Q.SPRITE_PLAYER = 2;
Q.isoTo2D=function(pt){
    var tempPt={
        x:(Q.tileLayerStartX+(2 * pt.y + pt.x))/2,
        y:(2 * pt.y - pt.x)/2
    };
    return tempPt;
};

Q.twoDToIso=function(pt){
    var tempPt = {
        x:Q.tileLayerStartX+pt.x-pt.y,
        y:(pt.x + pt.y)/2
    };
    return tempPt;
};

//Accepts a tile coordinate [x,y] and returns the x,y position in 2d
Q.getXY=function(pt){
    var tempPt ={
        x:Math.floor(pt[0]*Q.tileH),
        y:Math.floor(pt[1]*Q.tileH)
    };
    return tempPt;
};
//Sets the z property of an object
Q.setZ=function(y){
    return y-Q.tileH/2;
};

//Gets a target at a certain location
//Returns an object at the location
Q.getTargetAt=function(x,y){
    var target = Q(".commonPlayer").items.filter(function(obj){
        return obj.p.loc[0]===x&&obj.p.loc[1]===y;
    })[0];
    return target;
};
//For this demonstration isoControls is just a lightly modified stepControls.
Q.component("isoControls",{
    added: function() {
      var p = this.entity.p;

      if(!p.stepDistance) { p.stepDistance = 32; }
      if(!p.stepDelay) { p.stepDelay = 0.2; }

      p.stepWait = 0;
      this.entity.on("step",this,"step");
      this.entity.on("hit", this,"collision");
    },

    collision: function(col) {
      var p = this.entity.p;

      if(p.stepping) {
        p.stepping = false;
        p.x = p.origX;
        p.y = p.origY;
      }
    },
    atDest:function(){
        var p = this.entity.p;
        p.diffX = 0;
        p.diffY = 0;
        p.stepped=false;
        p.stepping=false;
        p.z = Q.setZ(p.y);
       
    },
    step: function(dt) {
      var p = this.entity.p,
          moved = false;
      p.stepWait -= dt;

      if(p.stepping) {
        p.x += p.diffX * dt / p.stepDelay;
        p.y += p.diffY * dt / p.stepDelay;
      }

      if(p.stepWait > 0) { return; }
      //This will run when the player gets to a square
      if(p.stepping) {
        p.x = p.destX;
        p.y = p.destY;
        //Set the location once the player reaches the square
        p.loc=p.locTo;
        this.atDest();
      }
      p.z=Q.setZ(p.y);
      p.stepping = false;

      p.diffX = 0;
      p.diffY = 0;

      if(Q.inputs['left']) {
        p.diffX = -p.stepDistance;
        p.diffY = -p.stepDistance/2;
        p.locTo = [p.loc[0]-1,p.loc[1]];
        p.dir = "left";
      } else if(Q.inputs['right']) {
        p.diffX = p.stepDistance;
        p.diffY = p.stepDistance/2;
        p.locTo = [p.loc[0]+1,p.loc[1]];
        p.dir = "right";
      } else if(Q.inputs['up']) {
        p.diffX = p.stepDistance;
        p.diffY = -p.stepDistance/2;
        p.locTo = [p.loc[0],p.loc[1]-1];
        p.dir = "up";
      } else if(Q.inputs['down']) {
        p.diffX = -p.stepDistance;
        p.diffY = p.stepDistance/2;
        p.locTo = [p.loc[0],p.loc[1]+1];
        p.dir = "down";
      }
      //This is run when the user presses a direction and the player is not already moving.
      if(p.diffY || p.diffX ) {
        p.stepping = true;
        p.origX = p.x;
        p.origY = p.y;
        p.destX = p.x + p.diffX;
        p.destY = p.y + p.diffY;
        p.stepWait = p.stepDelay;
        
        this.entity.playWalk(p.dir);
        //Don't collide with players
        if(Q.getTargetAt(p.locTo[0],p.locTo[1])){
            this.atDest();
            return;
        }
      } else {
          this.entity.playStand(p.dir);
      }

    }
}); 


Q.component("animations", {
    added:function(){
        this.entity.on("playStand");
    },
    extend:{
        checkPlayDir:function(dir){
            if(!dir){return this.p.dir;}else{return dir||"down";}
        },
        playStand:function(dir){
            this.play("standing"+this.checkPlayDir(dir));
        },
        playWalk:function(dir){
            this.play("walking"+this.checkPlayDir(dir));
        }
    }
});

//In this demo, this just allows for easy access to the player and dummies.
Q.component("commonPlayer",{});

Q.Sprite.extend("Player",{
    init: function(p) {
        this._super(p, {
            frame:0,
            sheet:"Professor",
            sprite:"player",
            w:64,h:64,
            dir:"down",
            type:Q.SPRITE_PLAYER
        });
        //Library
        this.add("2d, animation");
        var pos = Q.twoDToIso(Q.getXY(this.p.loc));
        this.p.x = pos.x;
        this.p.y = pos.y;
        this.p.z = Q.setZ(this.p.y);
        //My components
        this.add("isoControls,animations,commonPlayer");
        this.playStand(this.p.dir);
    }
});
Q.Sprite.extend("Dummy",{
    init: function(p) {
        this._super(p, {
            frame:0,
            sheet:"Professor",
            sprite:"player",
            w:64,h:64,
            dir:"up",
            type:Q.SPRITE_PLAYER
        });
        //Library
        this.add("2d, animation");
        //My components
        this.add("animations,commonPlayer");
        var pos = Q.twoDToIso(Q.getXY(this.p.loc));
        this.p.x = pos.x;
        this.p.y = pos.y;
        this.p.z=Q.setZ(this.p.y);
        this.playStand(this.p.dir);
    }
});

Q.setUpAnimations=function(){
    var toSheet = [
        ['Professor','professor.png',64,64]
    ];
    for(j=0;j<toSheet.length;j++){
        Q.sheet(toSheet[j][0],
        toSheet[j][1],
        {
           tilew:toSheet[j][2],
           tileh:toSheet[j][3],
           sx:0,
           sy:0
        });
    };

    var standRate = 1/3;
    var walkRate = 1/6;
    Q.animations("player", {
        standingdown:{ frames: [18,19], rate:standRate},
        walkingdown:{ frames: [18,19,20,21,22,23,24,25,26], rate:walkRate},
        
        standingup:{ frames: [0,1], rate:standRate},
        walkingup:{ frames: [0,1,2,3,4,5,6,7,8], rate:walkRate},
        
        standingleft:{ frames: [9,10], rate:standRate},
        walkingleft:{ frames: [9,10,11,12,13,14,15,16,17], rate:walkRate},
        
        standingright:{ frames: [27,28], rate:standRate},
        walkingright:{ frames: [27,28,29,30,31,32,33,34,35], rate:walkRate}
    });
};

Q.load("professor.png",function(){
    Q.scene("test",function(stage){
        Q.stageTMX("test.tmx",stage);
        //Can set this depending on where the tilelayer is drawn.
        //If the top of the tilelayer is at 0,0 then this should be 0
        //If the left side of the tilelayer is at 0,0 then this should be 0+half of the tilelayer's width
        Q.tileLayerStartX=0;//stage.lists.TileLayer[0].p.w/2;
        stage.add("viewport");
        //Insert the controllable player
        var player = stage.insert(new Q.Player({loc:[8,8]}));
        stage.follow(player);
        //Dummy players that you can walk behind
        stage.insert(new Q.Dummy({loc:[10,8]}));
        stage.insert(new Q.Dummy({loc:[10,9],dir:"left"}));
        stage.insert(new Q.Dummy({loc:[8,13],dir:"right"}));
    },{sort:true});
    Q.loadTMX("test.tmx",function(){
        Q.stageScene("test",1);
    });
    Q.setUpAnimations();
});

});