Quintus.IsoTileLayer= function(Q){

//The tile used in IsoTileLayer
Q.Sprite.extend("Tile",{
      init:function(props){
          this._super(props,{
              type: 0,
              renderAlways: true,
              cy:0
          });
      }
  });
//Modified version of TileLayer to support Isometric maps
Q.Sprite.extend("IsoTileLayer",{
  init: function(props) {
    this._super(props,{
      type: 0,
      renderAlways: true
    });
    if(this.p.dataAsset) {
      this.load(this.p.dataAsset);
    }

    this.setDimensions();
    this.blocks = [];
    this.p.blockTileW = this.p.tiles[0].length;
    this.p.blockTileH = this.p.tiles.length;
    this.p.blockW = this.p.tileW * this.p.blockTileW;
    this.p.blockH = this.p.tileH * this.p.blockTileH;

    this.colBounds = {};
    this.directions = [ 'top','left','right','bottom'];
    this.tileProperties = {};

    this.collisionObject = {
      p: {
        w: this.p.tileW,
        h: this.p.tileH,
        cx: this.p.tileW/2,
        cy: this.p.tileH/2
      }
    };

    this.tileCollisionObjects = {};

    this.collisionNormal = { separate: []};

    this._generateCollisionObjects();
  },
  // Generate the tileCollisionObject overrides where needed
  _generateCollisionObjects: function() {
    var self = this;

    function returnPoint(pt) {
      return [ pt[0] * self.p.tileW - self.p.tileW/2,
               pt[1] * self.p.tileH - self.p.tileH/2
             ];
    }

    if(this.sheet() && this.sheet().frameProperties) {
      var frameProperties = this.sheet().frameProperties;
      for(var k in frameProperties) {
        var colObj = this.tileCollisionObjects[k] = { p: Q._clone(this.collisionObject.p) };
        Q._extend(colObj.p,frameProperties[k]);

        if(colObj.p.points) {
          colObj.p.points = Q._map(colObj.p.points, returnPoint);
        }
        this.tileCollisionObjects[k] = colObj;
      }
    }

  },

  load: function(dataAsset) {
    var fileParts = dataAsset.split("."),
        fileExt = fileParts[fileParts.length-1].toLowerCase(),
        data;

    if (fileExt === "json") {
      data = Q._isString(dataAsset) ?  Q.asset(dataAsset) : dataAsset;
    }
    else {
      throw "file type not supported";
    }
    this.p.tiles = data;
  },

  setDimensions: function() {
    var tiles = this.p.tiles;

    if(tiles) {
      this.p.rows = tiles.length;
      this.p.cols = tiles[0].length;
      this.p.w = this.p.cols * this.p.tileW;
      this.p.h = this.p.rows * this.p.tileH;
    }
  },

  getTile: function(tileX,tileY) {
    return this.p.tiles[tileY] && this.p.tiles[tileY][tileX];
  },

  getTileProperty: function(tile, prop) {
    if(this.tileProperties[tile] !== undefined) {
      return this.tileProperties[tile][prop];
    } else {
      return;
    }
  },

  getTileProperties: function(tile) {
    if(this.tileProperties[tile] !== undefined) {
      return this.tileProperties[tile];
    } else {
      return {};
    }
  },

  getTilePropertyAt: function(tileX, tileY, prop) {
    return this.getTileProperty(this.getTile(tileX, tileY), prop);
  },

  getTilePropertiesAt: function(tileX, tileY) {
    return this.getTileProperties(this.getTile(tileX, tileY));
  },

  tileHasProperty: function(tile, prop) {
    return(this.getTileProperty(tile, prop) !== undefined);
  },

  setTile: function(x,y,tile) {
    var p = this.p,
        blockX = Math.floor(x/p.blockTileW),
        blockY = Math.floor(y/p.blockTileH);

    if(x >= 0 && x < this.p.cols &&
       y >= 0 && y < this.p.rows) {

      this.p.tiles[y][x] = tile;

      if(this.blocks[blockY]) {
        this.blocks[blockY][blockX] = null;
      }
    }
  },

  tilePresent: function(tileX,tileY) {
    return this.p.tiles[tileY] && this.collidableTile(this.p.tiles[tileY][tileX]);
  },

  // Overload this method to draw tiles at frame 0 or not draw
  // tiles at higher number frames
  drawableTile: function(tileNum) {
    return tileNum > 0;
  },

  // Overload this method to control which tiles trigger a collision
  // (defaults to all tiles > number 0)
  collidableTile: function(tileNum) {
    return tileNum > 0;
  },

  getCollisionObject: function(tileX, tileY) {
    var p = this.p,
        tile = this.getTile(tileX, tileY),
        colObj;

    colObj = (this.tileCollisionObjects[tile] !== undefined) ?
      this.tileCollisionObjects[tile] : this.collisionObject;

    colObj.p.x = tileX * p.tileW + p.x + p.tileW/2;
    colObj.p.y = tileY * p.tileH + p.y + p.tileH/2;

    return colObj;
  },

  collide: function(obj) {
    var p = this.p,
        objP = obj.c || obj.p,
        tileStartX = Math.floor((objP.x - objP.cx - p.x) / p.tileW),
        tileStartY = Math.floor((objP.y - objP.cy - p.y) / p.tileH),
        tileEndX =  Math.ceil((objP.x - objP.cx + objP.w - p.x) / p.tileW),
        tileEndY =  Math.ceil((objP.y - objP.cy + objP.h - p.y) / p.tileH),
        normal = this.collisionNormal,
        col, colObj;

    normal.collided = false;

    for(var tileY = tileStartY; tileY<=tileEndY; tileY++) {
      for(var tileX = tileStartX; tileX<=tileEndX; tileX++) {
        if(this.tilePresent(tileX,tileY)) {
          colObj = this.getCollisionObject(tileX, tileY);

          col = Q.collision(obj,colObj);

          if(col && col.magnitude > 0) {
            if(colObj.p.sensor) {
              colObj.tile = this.getTile(tileX,tileY);
              if(obj.trigger) {
                obj.trigger('sensor.tile',colObj);
              }
            } else if(!normal.collided || normal.magnitude < col.magnitude ) {
               normal.collided = true;
               normal.separate[0] = col.separate[0];
               normal.separate[1] = col.separate[1];
               normal.magnitude = col.magnitude;
               normal.distance = col.distance;
               normal.normalX = col.normalX;
               normal.normalY = col.normalY;
               normal.tileX = tileX;
               normal.tileY = tileY;
               normal.tile = this.getTile(tileX,tileY);
               if(obj.p.collisions !== undefined) {
                 obj.p.collisions.push(normal);
               }
            }
          }
        }
      }
    }

    return normal.collided ? normal : false;
  },

  //This is the method that I modified to allow for Isometric support
  prerenderBlock: function(blockX,blockY) {
    var p = this.p,
        tiles = p.tiles,
        sheet = this.sheet(),
        blockOffsetX = blockX*p.blockTileW,
        blockOffsetY = blockY*p.blockTileH;

    if(blockOffsetX < 0 || blockOffsetX >= this.p.cols ||
       blockOffsetY < 0 || blockOffsetY >= this.p.rows) {
         return;
    }
    var canvas = document.createElement('canvas'),
        ctx = canvas.getContext('2d');
    //Start the tilelayer drawing so that the furthest left tile is at 0,0 instead of the top
    //The reason for this was that with the original sheet.draw for drawing the tiles, it wouldn't draw anything below 0,0, 
    //so the left side of the map was cut off.
    //var tileLayerStartX = p.blockTileW*(p.tileW/2)-p.tileW/2;

    canvas.width = p.blockW;
    canvas.height= p.blockH;

    this.blocks[blockY] = this.blocks[blockY] || {};
    this.blocks[blockY][blockX] = canvas;
    //This is needed so that different tiles don't 'fight' to be drawn in front (which causes flickering) in Google Chrome
    var tileLayers = Q("IsoTileLayer").items;
    var tileLayerNum=0;
    for(i=0;i<tileLayers.length;i++){
        if(tileLayers[i].p.id===this.p.id){
            tileLayerNum = i;
        }
    }
    for(var y=0;y<p.blockTileH;y++) {
      if(tiles[y+blockOffsetY]) {
        for(var x=0;x<p.blockTileW;x++) {
          if(this.drawableTile(tiles[y+blockOffsetY][x+blockOffsetX])) {
              var pt = Q.twoDToIso({x:x*p.tileW/2,y:y*p.tileH/2});
              //Inserts a new Q.Tile for every tile. This is not what Quintus originally did when drawing the tile layer.
              //This way is not nearly as efficient as the sheet.draw way, but I couldn't figure out how to make a z-index work the other way
              this.stage.insert(new Q.Tile({x:pt.x,y:pt.y,z:pt.y+tileLayerNum,sheet:"tiles",frame:tiles[y+blockOffsetY][x+blockOffsetX]}));
              //Commented out the original tile drawing way.
              /*sheet.draw(ctx,
                  pt.x+tileLayerStartX,
                  pt.y,
                  tiles[y+blockOffsetY][x+blockOffsetX]);*/
          }
        }
      }
    }
  },

  drawBlock: function(ctx, blockX, blockY) {
    var p = this.p,
        startX = Math.floor(blockX * p.blockW + p.x),
        startY = Math.floor(blockY * p.blockH + p.y);
    if(!this.blocks[blockY] || !this.blocks[blockY][blockX]) {
      this.prerenderBlock(blockX,blockY);
    }
    /*if(this.blocks[blockY]  && this.blocks[blockY][blockX]) {
      ctx.drawImage(this.blocks[blockY][blockX],startX,startY);
    }*/
  },

  draw: function(ctx) {
    var p = this.p,
        viewport = this.stage.viewport,
        scale = viewport ? viewport.scale : 1,
        x = viewport ? viewport.x : 0,
        y = viewport ? viewport.y : 0,
        viewW = Q.width / scale,
        viewH = Q.height / scale,
        startBlockX = Math.floor((x - p.x) / p.blockW),
        startBlockY = Math.floor((y - p.y) / p.blockH),
        endBlockX = Math.floor((x + viewW - p.x) / p.blockW),
        endBlockY = Math.floor((y + viewH - p.y) / p.blockH);
    for(var iy=startBlockY;iy<=endBlockY;iy++) {
      for(var ix=startBlockX;ix<=endBlockX;ix++) {
        this.drawBlock(ctx,ix,iy);
      }
    }
  }
});
};