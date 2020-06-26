var SelectShape, Tool, createShape, getIsPointInBox, setShapePosition, setShapeSize,
  bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; },
  extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
  hasProp = {}.hasOwnProperty;

Tool = require('./base').Tool;

createShape = require('../core/shapes').createShape;

getIsPointInBox = function(point, box) {
  if (point.x < box.x) {
    return false;
  }
  if (point.y < box.y) {
    return false;
  }
  if (point.x > box.x + box.width) {
    return false;
  }
  if (point.y > box.y + box.height) {
    return false;
  }
  return true;
};

setShapeSize = function(shape, width, height) {
  shape.width = width;
  return shape.height = height;
};

setShapePosition = function(shape, x, y) {
  shape.x = x;
  return shape.y = y;
};

module.exports = SelectShape = (function(superClass) {
  extend(SelectShape, superClass);

  SelectShape.prototype.name = 'SelectShape';

  SelectShape.prototype.iconName = 'select';

  SelectShape.prototype.usesSimpleAPI = false;

  function SelectShape(lc) {
    this._selectKeyUpListener = bind(this._selectKeyUpListener, this);
    this._selectKeyDownListener = bind(this._selectKeyDownListener, this);
    this.selectCanvas = document.createElement('canvas');
    this.selectCanvas.style['background-color'] = 'transparent';
    this.selectCtx = this.selectCanvas.getContext('2d');
    this.shiftKeyDown = false;
    this.lc = lc;
  }

  SelectShape.prototype._selectKeyDownListener = function(e) {
    if (e.keyCode === 46) {
      this.lc.deleteShape(this.selectedShape);
      return this._clearCurrentShape(this.lc);
    } else if (e.keyCode === 16) {
      return this.shiftKeyDown = true;
    }
  };

  SelectShape.prototype._selectKeyUpListener = function(e) {
    if (e.keyCode === 16) {
      return this.shiftKeyDown = false;
    }
  };

  SelectShape.prototype._getSelectionShape = function(ctx, backgroundColor) {
    if (backgroundColor == null) {
      backgroundColor = null;
    }
    return createShape('SelectionBox', {
      shape: this.selectedShape,
      ctx: ctx,
      backgroundColor: backgroundColor
    });
  };

  SelectShape.prototype._setShapesInProgress = function(lc) {
    switch (this.currentShapeState) {
      case 'selected':
        return lc.setShapesInProgress([this._getSelectionShape(lc.ctx), this.selectedShape]);
      case 'editing':
        return lc.setShapesInProgress([this._getSelectionShape(lc.ctx, '#fff')]);
      default:
        return lc.setShapesInProgress([this.selectedShape]);
    }
  };

  SelectShape.prototype._updateInputEl = function(lc, withMargin) {
    var br, transformString;
    if (withMargin == null) {
      withMargin = false;
    }
    if (!this.inputEl) {
      return;
    }
    br = this.selectedShape.getBoundingRect(lc.ctx, true);
    this.inputEl.style.font = this.selectedShape.font;
    this.inputEl.style.color = this.selectedShape.color;
    this.inputEl.style.left = (lc.position.x / lc.backingScale + br.x * lc.scale - 4) + "px";
    this.inputEl.style.top = (lc.position.y / lc.backingScale + br.y * lc.scale - 4) + "px";
    if (withMargin && !this.selectedShape.forcedWidth) {
      this.inputEl.style.width = (br.width + 10 + this.selectedShape.renderer.emDashWidth) + "px";
    } else {
      this.inputEl.style.width = (br.width + 12) + "px";
    }
    if (withMargin) {
      this.inputEl.style.height = (br.height + 10 + this.selectedShape.renderer.metrics.leading) + "px";
    } else {
      this.inputEl.style.height = (br.height + 10) + "px";
    }
    transformString = "scale(" + lc.scale + ")";
    this.inputEl.style.transform = transformString;
    this.inputEl.style.webkitTransform = transformString;
    this.inputEl.style.MozTransform = transformString;
    this.inputEl.style.msTransform = transformString;
    return this.inputEl.style.OTransform = transformString;
  };

  SelectShape.prototype._ensureNotEditing = function(lc) {
    if (this.currentShapeState === 'editing') {
      return this._exitEditingState(lc);
    }
  };

  SelectShape.prototype._exitEditingState = function(lc) {
    this.currentShapeState = 'selected';
    lc.containerEl.removeChild(this.inputEl);
    this.inputEl = null;
    this._setShapesInProgress(lc);
    return lc.repaintLayer('main');
  };

  SelectShape.prototype._enterEditingState = function(lc) {
    var onChange;
    this.currentShapeState = 'editing';
    if (this.inputEl) {
      throw "State error";
    }
    this.inputEl = document.createElement('textarea');
    this.inputEl.className = 'text-tool-input';
    this.inputEl.style.position = 'absolute';
    this.inputEl.style.transformOrigin = '0px 0px';
    this.inputEl.style.backgroundColor = 'transparent';
    this.inputEl.style.border = 'none';
    this.inputEl.style.outline = 'none';
    this.inputEl.style.margin = '0';
    this.inputEl.style.padding = '4px';
    this.inputEl.style.zIndex = '1000';
    this.inputEl.style.overflow = 'hidden';
    this.inputEl.style.resize = 'none';
    this.inputEl.value = this.selectedShape.text;
    this.inputEl.addEventListener('mousedown', function(e) {
      return e.stopPropagation();
    });
    this.inputEl.addEventListener('touchstart', function(e) {
      return e.stopPropagation();
    });
    onChange = (function(_this) {
      return function(e) {
        _this.selectedShape.setText(e.target.value);
        _this.selectedShape.enforceMaxBoundingRect(lc);
        _this._setShapesInProgress(lc);
        lc.repaintLayer('main');
        _this._updateInputEl(lc);
        return e.stopPropagation();
      };
    })(this);
    this.inputEl.addEventListener('keydown', (function(_this) {
      return function() {
        return _this._updateInputEl(lc, true);
      };
    })(this));
    this.inputEl.addEventListener('keyup', onChange);
    this.inputEl.addEventListener('change', onChange);
    this._updateInputEl(lc);
    lc.containerEl.appendChild(this.inputEl);
    this.inputEl.focus();
    return this._setShapesInProgress(lc);
  };

  SelectShape.prototype._setCurrentShape = function(lc, shape, x, y) {
    var br;
    this.selectedShape = shape;
    this.currentShapeState = 'selected';
    this.selectedShapeClickCount = 0;
    lc.trigger('shapeSelected', {
      selectedShape: this.selectedShape
    });
    this._setShapesInProgress(lc);
    lc.repaintLayer('main');
    br = this.selectedShape.getBoundingRect();
    this.dragOffset = {
      x: x - br.x,
      y: y - br.y
    };
    document.addEventListener('keydown', this._selectKeyDownListener);
    return document.addEventListener('keyup', this._selectKeyUpListener);
  };

  SelectShape.prototype._clearCurrentShape = function(lc) {
    if (this.selectedShape != null) {
      if (this.selectedShape.hasOwnProperty('text')) {
        this._ensureNotEditing(lc);
        lc.updateShape(this.selectedShape);
      }
    }
    this.selectedShape = null;
    this.initialShapeBoundingRect = null;
    this.currentShapeState = null;
    lc.setShapesInProgress([]);
    lc.repaintLayer('main');
    document.removeEventListener('keydown', this._selectKeyListener);
    return document.removeEventListener('keyup', this._selectKeyUpListener);
  };

  SelectShape.prototype._getDragAction = function(lc, point) {
    var br, dragAction, selectionBox, selectionShape;
    dragAction = "none";
    br = this.selectedShape.getBoundingRect(lc.ctx);
    selectionShape = this._getSelectionShape(lc.ctx);
    selectionBox = selectionShape.getBoundingRect();
    if (getIsPointInBox(point, br)) {
      dragAction = 'move';
    }
    if (getIsPointInBox(point, selectionShape.getBottomRightHandleRect())) {
      dragAction = 'resizeBottomRight';
    }
    if (getIsPointInBox(point, selectionShape.getTopLeftHandleRect())) {
      dragAction = 'resizeTopLeft';
    }
    if (getIsPointInBox(point, selectionShape.getBottomLeftHandleRect())) {
      dragAction = 'resizeBottomLeft';
    }
    if (getIsPointInBox(point, selectionShape.getTopRightHandleRect())) {
      dragAction = 'resizeTopRight';
    }
    return dragAction;
  };

  SelectShape.prototype.didBecomeActive = function(lc) {
    var onDown, onDrag, onUp, selectShapeUnsubscribeFuncs;
    selectShapeUnsubscribeFuncs = [];
    this._selectShapeUnsubscribe = (function(_this) {
      return function() {
        var func, j, len, results;
        results = [];
        for (j = 0, len = selectShapeUnsubscribeFuncs.length; j < len; j++) {
          func = selectShapeUnsubscribeFuncs[j];
          results.push(func());
        }
        return results;
      };
    })(this);
    onDown = (function(_this) {
      return function(arg) {
        var noshape, point, shapeIndex, x, y;
        x = arg.x, y = arg.y;
        _this.dragAction = 'none';
        _this.didDrag = false;
        noshape = false;
        shapeIndex = _this._getPixel(x, y, lc, _this.selectCtx);
        if (shapeIndex !== null) {
          if (_this.selectedShape != null) {
            if (_this.selectedShape.id !== lc.shapes[shapeIndex].id) {
              _this._clearCurrentShape(lc);
              _this._setCurrentShape(lc, lc.shapes[shapeIndex], x, y);
            }
          } else {
            _this._setCurrentShape(lc, lc.shapes[shapeIndex], x, y);
          }
        }
        if (_this.selectedShape != null) {
          if (_this.currentShapeState === 'selected' || _this.currentShapeState === 'editing') {
            point = {
              x: x,
              y: y
            };
            _this.dragAction = _this._getDragAction(lc, point);
            _this.initialShapeBoundingRect = _this.selectedShape.getBoundingRect(lc.ctx);
            _this.dragOffset = {
              x: x - _this.initialShapeBoundingRect.x,
              y: y - _this.initialShapeBoundingRect.y
            };
            if (_this.dragAction === 'none') {
              return _this._clearCurrentShape(lc);
            }
          }
        }
      };
    })(this);
    onDrag = (function(_this) {
      return function(arg) {
        var br, brBottom, brRight, newHeight, newWidth, newX, newY, offset, x, y;
        x = arg.x, y = arg.y;
        if (_this.selectedShape != null) {
          _this.didDrag = true;
          br = _this.initialShapeBoundingRect;
          brRight = br.x + br.width;
          brBottom = br.y + br.height;
          switch (_this.dragAction) {
            case 'place':
              _this.selectedShape.x = x;
              _this.selectedShape.y = y;
              _this.didDrag = true;
              break;
            case 'move':
              _this.selectedShape.x = x - _this.dragOffset.x;
              _this.selectedShape.y = y - _this.dragOffset.y;
              _this.didDrag = true;
              break;
            case 'resizeBottomRight':
              newWidth = x - (_this.dragOffset.x - _this.initialShapeBoundingRect.width) - br.x;
              if (_this.shiftKeyDown) {
                newHeight = newWidth;
              } else {
                newHeight = y - (_this.dragOffset.y - _this.initialShapeBoundingRect.height) - br.y;
              }
              setShapeSize(_this.selectedShape, newWidth, newHeight);
              break;
            case 'resizeTopLeft':
              newHeight = brBottom - y + _this.dragOffset.y;
              if (_this.shiftKeyDown) {
                newWidth = newHeight;
              } else {
                newWidth = brRight - x + _this.dragOffset.x;
              }
              setShapeSize(_this.selectedShape, newWidth, newHeight);
              newY = y;
              if (_this.shiftKeyDown) {
                offset = br.y - y;
                newX = br.x - offset;
              } else {
                newX = x;
              }
              setShapePosition(_this.selectedShape, newX, newY);
              break;
            case 'resizeBottomLeft':
              newWidth = brRight - x + _this.dragOffset.x;
              if (_this.shiftKeyDown) {
                newHeight = newWidth;
              } else {
                newHeight = y - (_this.dragOffset.y - _this.initialShapeBoundingRect.height) - br.y;
              }
              setShapeSize(_this.selectedShape, newWidth, newHeight);
              newX = x - _this.dragOffset.x;
              newY = _this.selectedShape.y;
              setShapePosition(_this.selectedShape, newX, newY);
              break;
            case 'resizeTopRight':
              newHeight = brBottom - y + _this.dragOffset.y;
              if (_this.shiftKeyDown) {
                newWidth = newHeight;
              } else {
                newWidth = x - (_this.dragOffset.x - _this.initialShapeBoundingRect.width) - br.x;
              }
              setShapeSize(_this.selectedShape, newWidth, newHeight);
              newX = _this.selectedShape.x;
              if (_this.shiftKeyDown) {
                newY = y - _this.dragOffset.y;
              } else {
                newY = y - _this.dragOffset.y;
              }
              setShapePosition(_this.selectedShape, newX, newY);
          }
          _this._setShapesInProgress(lc);
          return lc.repaintLayer('main');

          /*
            @selectedShape.setUpperLeft {
              x: x - @dragOffset.x,
              y: y - @dragOffset.y
            }
          
            lc.setShapesInProgress [@selectedShape, createShape('SelectionBox', {
              shape: @selectedShape,
              handleSize: 0
            })]
            lc.repaintLayer 'main'
           */
        }
      };
    })(this);
    onUp = (function(_this) {
      return function(arg) {
        var x, y;
        x = arg.x, y = arg.y;
        if (_this.didDrag) {
          _this.didDrag = false;
          lc.trigger('shapeMoved', {
            shape: _this.selectedShape
          });
          lc.trigger('drawingChange', {});
          _this.currentShapeState = 'selected';
          _this._setShapesInProgress(lc);
          lc.repaintLayer('main');
          return _this._drawSelectCanvas(lc);
        } else {
          _this.selectedShapeClickCount++;
          if (_this.selectedShape != null) {
            if (_this.selectedShape.hasOwnProperty('text') && _this.currentShapeState === 'selected' && _this.selectedShapeClickCount >= 2) {
              _this._enterEditingState(lc);
              return lc.repaintLayer('main');
            }
          }
        }
      };
    })(this);
    selectShapeUnsubscribeFuncs.push(lc.on('lc-pointerdown', onDown));
    selectShapeUnsubscribeFuncs.push(lc.on('lc-pointerdrag', onDrag));
    selectShapeUnsubscribeFuncs.push(lc.on('lc-pointerup', onUp));
    return this._drawSelectCanvas(lc);
  };

  SelectShape.prototype.willBecomeInactive = function(lc) {
    this._clearCurrentShape(lc);
    this._selectShapeUnsubscribe();
    return lc.repaintLayer('main');
  };

  SelectShape.prototype._drawSelectCanvas = function(lc) {
    var shapes;
    this.selectCanvas.width = lc.canvas.width;
    this.selectCanvas.height = lc.canvas.height;
    this.selectCtx.clearRect(0, 0, this.selectCanvas.width, this.selectCanvas.height);
    shapes = lc.shapes.map((function(_this) {
      return function(shape, index) {
        return createShape('SelectionBox', {
          shape: shape,
          handleSize: 0,
          backgroundColor: "#" + (_this._intToHex(index))
        });
      };
    })(this));
    return lc.draw(shapes, this.selectCtx);
  };

  SelectShape.prototype._intToHex = function(i) {
    return ("000000" + (i.toString(16))).slice(-6);
  };

  SelectShape.prototype._getPixel = function(x, y, lc, ctx) {
    var p, pixel;
    p = lc.drawingCoordsToClientCoords(x, y);
    pixel = ctx.getImageData(p.x, p.y, 1, 1).data;
    if (pixel[3]) {
      return parseInt(this._rgbToHex(pixel[0], pixel[1], pixel[2]), 16);
    } else {
      return null;
    }
  };

  SelectShape.prototype._componentToHex = function(c) {
    var hex;
    hex = c.toString(16);
    return ("0" + hex).slice(-2);
  };

  SelectShape.prototype._rgbToHex = function(r, g, b) {
    return "" + (this._componentToHex(r)) + (this._componentToHex(g)) + (this._componentToHex(b));
  };

  return SelectShape;

})(Tool);
