"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/one-time/index.js
var require_one_time = __commonJS({
  "node_modules/one-time/index.js"(exports2, module2) {
    "use strict";
    module2.exports = function one(fn) {
      var called = 0, value;
      function onetime() {
        if (called)
          return value;
        called = 1;
        value = fn.apply(this, arguments);
        fn = null;
        return value;
      }
      onetime.displayName = fn.displayName || fn.name || onetime.displayName || onetime.name;
      return onetime;
    };
  }
});

// node_modules/say/platform/base.js
var require_base = __commonJS({
  "node_modules/say/platform/base.js"(exports2, module2) {
    var childProcess = require("child_process");
    var once = require_one_time();
    var SayPlatformBase = class {
      constructor() {
        this.child = null;
        this.baseSpeed = 0;
      }
      /**
       * Uses system libraries to speak text via the speakers.
       *
       * @param {string} text Text to be spoken
       * @param {string|null} voice Name of voice to be spoken with
       * @param {number|null} speed Speed of text (e.g. 1.0 for normal, 0.5 half, 2.0 double)
       * @param {Function|null} callback A callback of type function(err) to return.
       */
      speak(text, voice, speed, callback) {
        if (typeof callback !== "function") {
          callback = () => {
          };
        }
        callback = once(callback);
        if (!text) {
          return setImmediate(() => {
            callback(new TypeError("say.speak(): must provide text parameter"));
          });
        }
        let { command, args, pipedData, options } = this.buildSpeakCommand({ text, voice, speed });
        this.child = childProcess.spawn(command, args, options);
        this.child.stdin.setEncoding("ascii");
        this.child.stderr.setEncoding("ascii");
        if (pipedData) {
          this.child.stdin.end(pipedData);
        }
        this.child.stderr.once("data", (data) => {
          callback(new Error(data));
        });
        this.child.addListener("exit", (code, signal) => {
          if (code === null || signal !== null) {
            return callback(new Error(`say.speak(): could not talk, had an error [code: ${code}] [signal: ${signal}]`));
          }
          this.child = null;
          callback(null);
        });
      }
      /**
       * Uses system libraries to speak text via the speakers.
       *
       * @param {string} text Text to be spoken
       * @param {string|null} voice Name of voice to be spoken with
       * @param {number|null} speed Speed of text (e.g. 1.0 for normal, 0.5 half, 2.0 double)
       * @param {string} filename Path to file to write audio to, e.g. "greeting.wav"
       * @param {Function|null} callback A callback of type function(err) to return.
       */
      export(text, voice, speed, filename, callback) {
        if (typeof callback !== "function") {
          callback = () => {
          };
        }
        callback = once(callback);
        if (!text) {
          return setImmediate(() => {
            callback(new TypeError("say.export(): must provide text parameter"));
          });
        }
        if (!filename) {
          return setImmediate(() => {
            callback(new TypeError("say.export(): must provide filename parameter"));
          });
        }
        try {
          var { command, args, pipedData, options } = this.buildExportCommand({ text, voice, speed, filename });
        } catch (error) {
          return setImmediate(() => {
            callback(error);
          });
        }
        this.child = childProcess.spawn(command, args, options);
        this.child.stdin.setEncoding("ascii");
        this.child.stderr.setEncoding("ascii");
        if (pipedData) {
          this.child.stdin.end(pipedData);
        }
        this.child.stderr.once("data", (data) => {
          callback(new Error(data));
        });
        this.child.addListener("exit", (code, signal) => {
          if (code === null || signal !== null) {
            return callback(new Error(`say.export(): could not talk, had an error [code: ${code}] [signal: ${signal}]`));
          }
          this.child = null;
          callback(null);
        });
      }
      /**
       * Stops currently playing audio. There will be unexpected results if multiple audios are being played at once
       *
       * TODO: If two messages are being spoken simultaneously, childD points to new instance, no way to kill previous
       *
       * @param {Function|null} callback A callback of type function(err) to return.
       */
      stop(callback) {
        if (typeof callback !== "function") {
          callback = () => {
          };
        }
        callback = once(callback);
        if (!this.child) {
          return setImmediate(() => {
            callback(new Error("say.stop(): no speech to kill"));
          });
        }
        this.runStopCommand();
        this.child = null;
        callback(null);
      }
      convertSpeed(speed) {
        return Math.ceil(this.baseSpeed * speed);
      }
      /**
      * Get Installed voices on system
      * @param {Function} callback A callback of type function(err,voices) to return.
      */
      getInstalledVoices(callback) {
        if (typeof callback !== "function") {
          callback = () => {
          };
        }
        callback = once(callback);
        let { command, args } = this.getVoices();
        var voices = [];
        this.child = childProcess.spawn(command, args);
        this.child.stdin.setEncoding("ascii");
        this.child.stderr.setEncoding("ascii");
        this.child.stderr.once("data", (data) => {
          callback(new Error(data));
        });
        this.child.stdout.on("data", function(data) {
          voices += data;
        });
        this.child.addListener("exit", (code, signal) => {
          if (code === null || signal !== null) {
            return callback(new Error(`say.getInstalledVoices(): could not get installed voices, had an error [code: ${code}] [signal: ${signal}]`));
          }
          if (voices.length > 0) {
            voices = voices.split("\r\n");
            voices = voices[voices.length - 1] === "" ? voices.slice(0, voices.length - 1) : voices;
          }
          this.child = null;
          callback(null, voices);
        });
        this.child.stdin.end();
      }
    };
    module2.exports = SayPlatformBase;
  }
});

// node_modules/say/platform/linux.js
var require_linux = __commonJS({
  "node_modules/say/platform/linux.js"(exports2, module2) {
    var SayPlatformBase = require_base();
    var BASE_SPEED = 100;
    var COMMAND = "festival";
    var SayPlatformLinux = class extends SayPlatformBase {
      constructor() {
        super();
        this.baseSpeed = BASE_SPEED;
      }
      buildSpeakCommand({ text, voice, speed }) {
        let args = [];
        let pipedData = "";
        let options = {};
        args.push("--pipe");
        if (speed) {
          pipedData += `(Parameter.set 'Audio_Command "aplay -q -c 1 -t raw -f s16 -r $(($SR*${this.convertSpeed(speed)}/100)) $FILE") `;
        }
        if (voice) {
          pipedData += `(${voice}) `;
        }
        pipedData += `(SayText "${text}")`;
        return { command: COMMAND, args, pipedData, options };
      }
      buildExportCommand({ text, voice, speed, filename }) {
        throw new Error(`say.export(): does not support platform ${this.platform}`);
      }
      runStopCommand() {
        process.kill(this.child.pid + 2);
      }
      getVoices() {
        throw new Error(`say.export(): does not support platform ${this.platform}`);
      }
    };
    module2.exports = SayPlatformLinux;
  }
});

// node_modules/say/platform/darwin.js
var require_darwin = __commonJS({
  "node_modules/say/platform/darwin.js"(exports2, module2) {
    var SayPlatformBase = require_base();
    var BASE_SPEED = 175;
    var COMMAND = "say";
    var SayPlatformDarwin = class extends SayPlatformBase {
      constructor() {
        super();
        this.baseSpeed = BASE_SPEED;
      }
      buildSpeakCommand({ text, voice, speed }) {
        let args = [];
        let pipedData = "";
        let options = {};
        if (!voice) {
          args.push(text);
        } else {
          args.push("-v", voice, text);
        }
        if (speed) {
          args.push("-r", this.convertSpeed(speed));
        }
        return { command: COMMAND, args, pipedData, options };
      }
      buildExportCommand({ text, voice, speed, filename }) {
        let args = [];
        let pipedData = "";
        let options = {};
        if (!voice) {
          args.push(text);
        } else {
          args.push("-v", voice, text);
        }
        if (speed) {
          args.push("-r", this.convertSpeed(speed));
        }
        if (filename) {
          args.push("-o", filename, "--data-format=LEF32@32000");
        }
        return { command: COMMAND, args, pipedData, options };
      }
      runStopCommand() {
        this.child.stdin.pause();
        this.child.kill();
      }
      getVoices() {
        throw new Error(`say.export(): does not support platform ${this.platform}`);
      }
    };
    module2.exports = SayPlatformDarwin;
  }
});

// node_modules/say/platform/win32.js
var require_win32 = __commonJS({
  "node_modules/say/platform/win32.js"(exports2, module2) {
    var childProcess = require("child_process");
    var SayPlatformBase = require_base();
    var BASE_SPEED = 0;
    var COMMAND = "powershell";
    var SayPlatformWin32 = class extends SayPlatformBase {
      constructor() {
        super();
        this.baseSpeed = BASE_SPEED;
      }
      buildSpeakCommand({ text, voice, speed }) {
        let args = [];
        let pipedData = "";
        let options = {};
        let psCommand = `Add-Type -AssemblyName System.speech;$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;`;
        if (voice) {
          psCommand += `$speak.SelectVoice('${voice}');`;
        }
        if (speed) {
          let adjustedSpeed = this.convertSpeed(speed || 1);
          psCommand += `$speak.Rate = ${adjustedSpeed};`;
        }
        psCommand += `$speak.Speak([Console]::In.ReadToEnd())`;
        pipedData += text;
        args.push(psCommand);
        options.shell = true;
        return { command: COMMAND, args, pipedData, options };
      }
      buildExportCommand({ text, voice, speed, filename }) {
        throw new Error(`say.export(): does not support platform ${this.platform}`);
      }
      runStopCommand() {
        this.child.stdin.pause();
        childProcess.exec(`taskkill /pid ${this.child.pid} /T /F`);
      }
      convertSpeed(speed) {
        return Math.max(-10, Math.min(Math.round(9.0686 * Math.log(speed) - 0.1806), 10));
      }
      getVoices() {
        let args = [];
        let psCommand = "Add-Type -AssemblyName System.speech;$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer;$speak.GetInstalledVoices() | % {$_.VoiceInfo.Name}";
        args.push(psCommand);
        return { command: COMMAND, args };
      }
    };
    module2.exports = SayPlatformWin32;
  }
});

// node_modules/say/index.js
var require_say = __commonJS({
  "node_modules/say/index.js"(exports2, module2) {
    var SayLinux = require_linux();
    var SayMacos = require_darwin();
    var SayWin32 = require_win32();
    var MACOS = "darwin";
    var LINUX = "linux";
    var WIN32 = "win32";
    var Say = class {
      constructor(platform3) {
        if (!platform3) {
          platform3 = process.platform;
        }
        if (platform3 === MACOS) {
          return new SayMacos();
        } else if (platform3 === LINUX) {
          return new SayLinux();
        } else if (platform3 === WIN32) {
          return new SayWin32();
        }
        throw new Error(`new Say(): unsupported platorm! ${platform3}`);
      }
    };
    module2.exports = new Say();
    module2.exports.Say = Say;
    module2.exports.platforms = {
      WIN32,
      MACOS,
      LINUX
    };
  }
});

// node_modules/@textlint/ast-node-types/lib/index.js
var require_lib = __commonJS({
  "node_modules/@textlint/ast-node-types/lib/index.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.ASTNodeTypes = void 0;
    var ASTNodeTypes;
    (function(ASTNodeTypes2) {
      ASTNodeTypes2["Document"] = "Document";
      ASTNodeTypes2["DocumentExit"] = "Document:exit";
      ASTNodeTypes2["Paragraph"] = "Paragraph";
      ASTNodeTypes2["ParagraphExit"] = "Paragraph:exit";
      ASTNodeTypes2["BlockQuote"] = "BlockQuote";
      ASTNodeTypes2["BlockQuoteExit"] = "BlockQuote:exit";
      ASTNodeTypes2["ListItem"] = "ListItem";
      ASTNodeTypes2["ListItemExit"] = "ListItem:exit";
      ASTNodeTypes2["List"] = "List";
      ASTNodeTypes2["ListExit"] = "List:exit";
      ASTNodeTypes2["Header"] = "Header";
      ASTNodeTypes2["HeaderExit"] = "Header:exit";
      ASTNodeTypes2["CodeBlock"] = "CodeBlock";
      ASTNodeTypes2["CodeBlockExit"] = "CodeBlock:exit";
      ASTNodeTypes2["HtmlBlock"] = "HtmlBlock";
      ASTNodeTypes2["HtmlBlockExit"] = "HtmlBlock:exit";
      ASTNodeTypes2["HorizontalRule"] = "HorizontalRule";
      ASTNodeTypes2["HorizontalRuleExit"] = "HorizontalRule:exit";
      ASTNodeTypes2["Comment"] = "Comment";
      ASTNodeTypes2["CommentExit"] = "Comment:exit";
      ASTNodeTypes2["ReferenceDef"] = "ReferenceDef";
      ASTNodeTypes2["ReferenceDefExit"] = "ReferenceDef:exit";
      ASTNodeTypes2["Str"] = "Str";
      ASTNodeTypes2["StrExit"] = "Str:exit";
      ASTNodeTypes2["Break"] = "Break";
      ASTNodeTypes2["BreakExit"] = "Break:exit";
      ASTNodeTypes2["Emphasis"] = "Emphasis";
      ASTNodeTypes2["EmphasisExit"] = "Emphasis:exit";
      ASTNodeTypes2["Strong"] = "Strong";
      ASTNodeTypes2["StrongExit"] = "Strong:exit";
      ASTNodeTypes2["Html"] = "Html";
      ASTNodeTypes2["HtmlExit"] = "Html:exit";
      ASTNodeTypes2["Link"] = "Link";
      ASTNodeTypes2["LinkExit"] = "Link:exit";
      ASTNodeTypes2["Image"] = "Image";
      ASTNodeTypes2["ImageExit"] = "Image:exit";
      ASTNodeTypes2["Code"] = "Code";
      ASTNodeTypes2["CodeExit"] = "Code:exit";
      ASTNodeTypes2["Delete"] = "Delete";
      ASTNodeTypes2["DeleteExit"] = "Delete:exit";
    })(ASTNodeTypes = exports2.ASTNodeTypes || (exports2.ASTNodeTypes = {}));
  }
});

// node_modules/boundary/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/boundary/lib/index.js"(exports2) {
    "use strict";
    function compare(v1, v2) {
      return v1 < v2;
    }
    function upperBound(array, value, comp) {
      if (comp === void 0)
        comp = compare;
      return function() {
        var len = array.length;
        var i = 0;
        while (len) {
          var diff = len >>> 1;
          var cursor = i + diff;
          if (comp(value, array[cursor])) {
            len = diff;
          } else {
            i = cursor + 1;
            len -= diff + 1;
          }
        }
        return i;
      }();
    }
    function lowerBound(array, value, comp) {
      if (comp === void 0)
        comp = compare;
      return function() {
        var len = array.length;
        var i = 0;
        while (len) {
          var diff = len >>> 1;
          var cursor = i + diff;
          if (comp(array[cursor], value)) {
            i = cursor + 1;
            len -= diff + 1;
          } else {
            len = diff;
          }
        }
        return i;
      }();
    }
    function binarySearch(array, value, comp) {
      if (comp === void 0)
        comp = compare;
      return function() {
        var cursor = lowerBound(array, value, comp);
        return cursor !== array.length && !comp(value, array[cursor]);
      }();
    }
    exports2.compare = compare;
    exports2.lowerBound = lowerBound;
    exports2.upperBound = upperBound;
    exports2.binarySearch = binarySearch;
  }
});

// node_modules/structured-source/lib/structured-source.js
var require_structured_source = __commonJS({
  "node_modules/structured-source/lib/structured-source.js"(exports2) {
    "use strict";
    var _classProps = function(child, staticProps, instanceProps) {
      if (staticProps)
        Object.defineProperties(child, staticProps);
      if (instanceProps)
        Object.defineProperties(child.prototype, instanceProps);
    };
    var upperBound = require_lib2().upperBound;
    var Position = function Position2(line, column) {
      this.line = line;
      this.column = column;
    };
    exports2.Position = Position;
    var SourceLocation = function SourceLocation2(start, end) {
      this.start = start;
      this.end = end;
    };
    exports2.SourceLocation = SourceLocation;
    var StructuredSource = function() {
      var StructuredSource2 = (
        /**
         * @constructs StructuredSource
         * @param {string} source - source code text.
         */
        function StructuredSource3(source) {
          this.indice = [0];
          var regexp = /[\r\n\u2028\u2029]/g;
          var length = source.length;
          regexp.lastIndex = 0;
          while (true) {
            var result = regexp.exec(source);
            if (!result) {
              break;
            }
            var index = result.index;
            if (source.charCodeAt(index) === 13 && source.charCodeAt(index + 1) === 10) {
              index += 1;
            }
            var nextIndex = index + 1;
            if (length < nextIndex) {
              break;
            }
            this.indice.push(nextIndex);
            regexp.lastIndex = nextIndex;
          }
        }
      );
      StructuredSource2.prototype.locationToRange = function(loc) {
        return [this.positionToIndex(loc.start), this.positionToIndex(loc.end)];
      };
      StructuredSource2.prototype.rangeToLocation = function(range) {
        return new SourceLocation(this.indexToPosition(range[0]), this.indexToPosition(range[1]));
      };
      StructuredSource2.prototype.positionToIndex = function(pos) {
        var start = this.indice[pos.line - 1];
        return start + pos.column;
      };
      StructuredSource2.prototype.indexToPosition = function(index) {
        var startLine = upperBound(this.indice, index);
        return new Position(startLine, index - this.indice[startLine - 1]);
      };
      _classProps(StructuredSource2, null, {
        line: {
          get: function() {
            return this.indice.length;
          }
        }
      });
      return StructuredSource2;
    }();
    exports2["default"] = StructuredSource;
  }
});

// node_modules/structured-source/lib/index.js
var require_lib3 = __commonJS({
  "node_modules/structured-source/lib/index.js"(exports2, module2) {
    "use strict";
    var StructuredSource = require_structured_source()["default"];
    module2.exports = StructuredSource;
  }
});

// node_modules/sentence-splitter/lib/parser/SourceCode.js
var require_SourceCode = __commonJS({
  "node_modules/sentence-splitter/lib/parser/SourceCode.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var StructureSource = require_lib3();
    var SourceCode = (
      /** @class */
      function() {
        function SourceCode2(input) {
          this.index = 0;
          this.contexts = [];
          this.contextRanges = [];
          if (typeof input === "string") {
            this.textCharacters = input.split("");
            this.source = new StructureSource(input);
            this.startOffset = 0;
            this.firstChildPadding = 0;
          } else {
            this.sourceNode = input;
            this.startOffset = this.sourceNode.range[0];
            this.index = this.startOffset;
            var lineBreaks = Array.from(new Array(this.sourceNode.loc.start.line - 1)).fill("\n");
            var offset = Array.from(new Array(this.startOffset - lineBreaks.length)).fill("\u222F");
            this.textCharacters = offset.concat(lineBreaks, input.raw.split(""));
            this.source = new StructureSource(this.textCharacters.join(""));
            if (this.sourceNode.children[0]) {
              this.firstChildPadding = this.sourceNode.children[0].range[0] - this.startOffset;
            } else {
              this.firstChildPadding = 0;
            }
          }
        }
        SourceCode2.prototype.markContextRange = function(range) {
          this.contextRanges.push(range);
        };
        SourceCode2.prototype.isInContextRange = function() {
          var offset = this.offset;
          return this.contextRanges.some(function(range) {
            return range[0] <= offset && offset < range[1];
          });
        };
        SourceCode2.prototype.enterContext = function(context) {
          this.contexts.push(context);
        };
        SourceCode2.prototype.isInContext = function(context) {
          if (!context) {
            return this.contexts.length > 0;
          }
          return this.contexts.some(function(targetContext) {
            return targetContext === context;
          });
        };
        SourceCode2.prototype.leaveContext = function(context) {
          var index = this.contexts.lastIndexOf(context);
          if (index !== -1) {
            this.contexts.splice(index, 1);
          }
        };
        Object.defineProperty(SourceCode2.prototype, "offset", {
          /**
           * Return current offset value
           * @returns {number}
           */
          get: function() {
            return this.index + this.firstChildPadding;
          },
          enumerable: true,
          configurable: true
        });
        SourceCode2.prototype.now = function() {
          var indexWithChildrenOffset = this.offset;
          var position = this.source.indexToPosition(indexWithChildrenOffset);
          return {
            line: position.line,
            column: position.column,
            offset: indexWithChildrenOffset
          };
        };
        Object.defineProperty(SourceCode2.prototype, "hasEnd", {
          /**
           * Return true, no more read char
           */
          get: function() {
            return this.read() === false;
          },
          enumerable: true,
          configurable: true
        });
        SourceCode2.prototype.read = function(over) {
          if (over === void 0) {
            over = 0;
          }
          var index = this.offset + over;
          if (index < this.startOffset) {
            return false;
          }
          if (0 <= index && index < this.textCharacters.length) {
            return this.textCharacters[index];
          }
          return false;
        };
        SourceCode2.prototype.readNode = function(over) {
          if (over === void 0) {
            over = 0;
          }
          if (!this.sourceNode) {
            return false;
          }
          var index = this.offset + over;
          if (index < this.startOffset) {
            return false;
          }
          var matchNodeList = this.sourceNode.children.filter(function(node) {
            return node.range[0] <= index && index < node.range[1];
          });
          if (matchNodeList.length > 0) {
            return matchNodeList[matchNodeList.length - 1];
          }
          return false;
        };
        SourceCode2.prototype.peek = function() {
          this.index += 1;
        };
        SourceCode2.prototype.peekNode = function(node) {
          this.index += node.range[1] - node.range[0];
        };
        SourceCode2.prototype.seekNext = function(parser) {
          var startPosition = this.now();
          parser.seek(this);
          var endPosition = this.now();
          var value = this.sliceRange(startPosition.offset, endPosition.offset);
          return {
            value,
            startPosition,
            endPosition
          };
        };
        SourceCode2.prototype.sliceRange = function(start, end) {
          return this.textCharacters.slice(start, end).join("");
        };
        return SourceCode2;
      }()
    );
    exports2.SourceCode = SourceCode;
  }
});

// node_modules/sentence-splitter/lib/parser/NewLineParser.js
var require_NewLineParser = __commonJS({
  "node_modules/sentence-splitter/lib/parser/NewLineParser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var NewLineParser = (
      /** @class */
      function() {
        function NewLineParser2() {
        }
        NewLineParser2.prototype.test = function(sourceCode) {
          var string = sourceCode.read();
          if (!string) {
            return false;
          }
          return /[\r\n]/.test(string);
        };
        NewLineParser2.prototype.seek = function(sourceCode) {
          while (this.test(sourceCode)) {
            sourceCode.peek();
          }
        };
        return NewLineParser2;
      }()
    );
    exports2.NewLineParser = NewLineParser;
  }
});

// node_modules/sentence-splitter/lib/parser/SpaceParser.js
var require_SpaceParser = __commonJS({
  "node_modules/sentence-splitter/lib/parser/SpaceParser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var SpaceParser = (
      /** @class */
      function() {
        function SpaceParser2() {
        }
        SpaceParser2.prototype.test = function(sourceCode) {
          var string = sourceCode.read();
          if (!string) {
            return false;
          }
          return /\s/.test(string);
        };
        SpaceParser2.prototype.seek = function(sourceCode) {
          while (this.test(sourceCode)) {
            sourceCode.peek();
          }
        };
        return SpaceParser2;
      }()
    );
    exports2.SpaceParser = SpaceParser;
  }
});

// node_modules/sentence-splitter/lib/parser/SeparatorParser.js
var require_SeparatorParser = __commonJS({
  "node_modules/sentence-splitter/lib/parser/SeparatorParser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var separatorPattern = /[.．。?!？！]/;
    var SeparatorParser = (
      /** @class */
      function() {
        function SeparatorParser2() {
        }
        SeparatorParser2.prototype.test = function(sourceCode) {
          if (sourceCode.isInContext()) {
            return false;
          }
          if (sourceCode.isInContextRange()) {
            return false;
          }
          var firstChar = sourceCode.read();
          var nextChar = sourceCode.read(1);
          if (!firstChar) {
            return false;
          }
          if (!separatorPattern.test(firstChar)) {
            return false;
          }
          if (firstChar === ".") {
            if (nextChar) {
              return /[\s\t\r\n]/.test(nextChar);
            } else {
              return true;
            }
          }
          return true;
        };
        SeparatorParser2.prototype.seek = function(sourceCode) {
          while (this.test(sourceCode)) {
            sourceCode.peek();
          }
        };
        return SeparatorParser2;
      }()
    );
    exports2.SeparatorParser = SeparatorParser;
  }
});

// node_modules/sentence-splitter/lib/parser/AnyValueParser.js
var require_AnyValueParser = __commonJS({
  "node_modules/sentence-splitter/lib/parser/AnyValueParser.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var AnyValueParser = (
      /** @class */
      function() {
        function AnyValueParser2(options) {
          this.parsers = options.parsers;
          this.markers = options.markers;
        }
        AnyValueParser2.prototype.test = function(sourceCode) {
          if (sourceCode.hasEnd) {
            return false;
          }
          return this.parsers.every(function(parser) {
            return !parser.test(sourceCode);
          });
        };
        AnyValueParser2.prototype.seek = function(sourceCode) {
          var currentNode = sourceCode.readNode();
          if (!currentNode) {
            while (this.test(sourceCode)) {
              this.markers.forEach(function(marker) {
                return marker.mark(sourceCode);
              });
              sourceCode.peek();
            }
            return;
          }
          var isInCurrentNode = function() {
            var currentOffset = sourceCode.offset;
            return currentNode.range[0] <= currentOffset && currentOffset < currentNode.range[1];
          };
          while (isInCurrentNode() && this.test(sourceCode)) {
            this.markers.forEach(function(marker) {
              return marker.mark(sourceCode);
            });
            sourceCode.peek();
          }
        };
        return AnyValueParser2;
      }()
    );
    exports2.AnyValueParser = AnyValueParser;
  }
});

// node_modules/sentence-splitter/lib/parser/lang/English.js
var require_English = __commonJS({
  "node_modules/sentence-splitter/lib/parser/lang/English.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.English = {
      ABBREVIATIONS: [
        "Adj.",
        "Adm.",
        "Adv.",
        "Al.",
        "Ala.",
        "Alta.",
        "Apr.",
        "Arc.",
        "Ariz.",
        "Ark.",
        "Art.",
        "Assn.",
        "Asst.",
        "Attys.",
        "Aug.",
        "Ave.",
        "Bart.",
        "Bld.",
        "Bldg.",
        "Blvd.",
        "Brig.",
        "Bros.",
        "Btw.",
        "Cal.",
        "Calif.",
        "Capt.",
        "Cl.",
        "Cmdr.",
        "Co.",
        "Col.",
        "Colo.",
        "Comdr.",
        "Con.",
        "Conn.",
        "Corp.",
        "Cpl.",
        "Cres.",
        "Ct.",
        "D.phil.",
        "Dak.",
        "Dec.",
        "Del.",
        "Dept.",
        "Det.",
        "Dist.",
        "Dr.",
        "Dr.phil.",
        "Dr.philos.",
        "Drs.",
        "E.g.",
        "Ens.",
        "Esp.",
        "Esq.",
        "Etc.",
        "Exp.",
        "Expy.",
        "Ext.",
        "Feb.",
        "Fed.",
        "Fla.",
        "Ft.",
        "Fwy.",
        "Fy.",
        "Ga.",
        "Gen.",
        "Gov.",
        "Hon.",
        "Hosp.",
        "Hr.",
        "Hway.",
        "Hwy.",
        "I.e.",
        "Ia.",
        "Id.",
        "Ida.",
        "Ill.",
        "Inc.",
        "Ind.",
        "Ing.",
        "Insp.",
        "Is.",
        "Jan.",
        "Jr.",
        "Jul.",
        "Jun.",
        "Kan.",
        "Kans.",
        "Ken.",
        "Ky.",
        "La.",
        "Lt.",
        "Ltd.",
        "Maj.",
        "Man.",
        "Mar.",
        "Mass.",
        "May.",
        "Md.",
        "Me.",
        "Med.",
        "Messrs.",
        "Mex.",
        "Mfg.",
        "Mich.",
        "Min.",
        "Minn.",
        "Miss.",
        "Mlle.",
        "Mm.",
        "Mme.",
        "Mo.",
        "Mont.",
        "Mr.",
        "Mrs.",
        "Ms.",
        "Msgr.",
        "Mssrs.",
        "Mt.",
        "Mtn.",
        "Neb.",
        "Nebr.",
        "Nev.",
        "No.",
        "Nos.",
        "Nov.",
        "Nr.",
        "Oct.",
        "Ok.",
        "Okla.",
        "Ont.",
        "Op.",
        "Ord.",
        "Ore.",
        "P.",
        "Pa.",
        "Pd.",
        "Pde.",
        "Penn.",
        "Penna.",
        "Pfc.",
        "Ph.",
        "Ph.d.",
        "Pl.",
        "Plz.",
        "Pp.",
        "Prof.",
        "Pvt.",
        "Que.",
        "Rd.",
        "Rs.",
        "Ref.",
        "Rep.",
        "Reps.",
        "Res.",
        "Rev.",
        "Rt.",
        "Sask.",
        "Sec.",
        "Sen.",
        "Sens.",
        "Sep.",
        "Sept.",
        "Sfc.",
        "Sgt.",
        "Sr.",
        "St.",
        "Supt.",
        "Surg.",
        "Tce.",
        "Tenn.",
        "Tex.",
        "Univ.",
        "Usafa.",
        "U.S.",
        "Ut.",
        "Va.",
        "V.",
        "Ver.",
        "Vs.",
        "Vt.",
        "Wash.",
        "Wis.",
        "Wisc.",
        "Wy.",
        "Wyo.",
        "Yuk."
      ],
      PREPOSITIVE_ABBREVIATIONS: [
        "Adm.",
        "Attys.",
        "Brig.",
        "Capt.",
        "Cmdr.",
        "Col.",
        "Cpl.",
        "Det.",
        "Dr.",
        "Gen.",
        "Gov.",
        "Ing.",
        "Lt.",
        "Maj.",
        "Mr.",
        "Mrs.",
        "Ms.",
        "Mt.",
        "Messrs.",
        "Mssrs.",
        "Prof.",
        "Ph.",
        "Rep.",
        "Reps.",
        "Rev.",
        "Sen.",
        "Sens.",
        "Sgt.",
        "St.",
        "Supt.",
        "V.",
        "Vs."
      ],
      EXCALAMATION_WORDS: [
        "!X\u0169",
        "!Kung",
        "\u01C3\u02BCO\u01C3Kung",
        "!Xuun",
        "!Kung-Ekoka",
        "\u01C3Hu",
        "\u01C3Khung",
        "\u01C3Ku",
        "\u01C3ung",
        "\u01C3Xo",
        "\u01C3X\xFB",
        "\u01C3Xung",
        "\u01C3X\u0169",
        "!Xun",
        "Yahoo!",
        "Y!J",
        "Yum!"
      ]
    };
  }
});

// node_modules/sentence-splitter/lib/parser/AbbrMarker.js
var require_AbbrMarker = __commonJS({
  "node_modules/sentence-splitter/lib/parser/AbbrMarker.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var English_1 = require_English();
    var isCapitalized = function(text) {
      if (!text || text.length === 0) {
        return false;
      }
      return /^[A-Z]/.test(text);
    };
    var compareNoCaseSensitive = function(a, b) {
      return a.toLowerCase() === b.toLowerCase();
    };
    var AbbrMarker = (
      /** @class */
      function() {
        function AbbrMarker2(lang) {
          if (lang === void 0) {
            lang = English_1.English;
          }
          this.lang = lang;
        }
        AbbrMarker2.prototype.getWord = function(sourceCode, startIndex) {
          if (startIndex === void 0) {
            startIndex = 0;
          }
          var whiteSpace = /\s/;
          var prevChar = sourceCode.read(-1);
          if (prevChar && !whiteSpace.test(prevChar)) {
            return "";
          }
          var word = "";
          var count = startIndex;
          var char = "";
          while (char = sourceCode.read(count)) {
            if (whiteSpace.test(char)) {
              break;
            }
            word += char;
            count++;
          }
          return word;
        };
        AbbrMarker2.prototype.getPrevWord = function(sourceCode) {
          var whiteSpace = /\s/;
          var count = -1;
          var char = "";
          while (char = sourceCode.read(count)) {
            if (!whiteSpace.test(char)) {
              break;
            }
            count--;
          }
          while (char = sourceCode.read(count)) {
            if (whiteSpace.test(char)) {
              break;
            }
            count--;
          }
          return this.getWord(sourceCode, count + 1);
        };
        AbbrMarker2.prototype.mark = function(sourceCode) {
          if (sourceCode.isInContextRange()) {
            return;
          }
          var currentWord = this.getWord(sourceCode);
          if (currentWord.length === 0) {
            return;
          }
          if (/^([a-zA-Z]\.){3,}$/.test(currentWord)) {
            return sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
          }
          var isMatchedEXCALAMATION_WORDS = this.lang.EXCALAMATION_WORDS.some(function(abbr) {
            return compareNoCaseSensitive(abbr, currentWord);
          });
          if (isMatchedEXCALAMATION_WORDS) {
            return sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
          }
          var isMatchedPREPOSITIVE_ABBREVIATIONS = this.lang.PREPOSITIVE_ABBREVIATIONS.some(function(abbr) {
            return compareNoCaseSensitive(abbr, currentWord);
          });
          if (isMatchedPREPOSITIVE_ABBREVIATIONS) {
            return sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
          }
          var isMatched = this.lang.ABBREVIATIONS.some(function(abbr) {
            return compareNoCaseSensitive(abbr, currentWord);
          });
          var prevWord = this.getPrevWord(sourceCode);
          var nextWord = this.getWord(sourceCode, currentWord.length + 1);
          if (isCapitalized(prevWord) && /[A-Z]\./.test(currentWord) && isCapitalized(nextWord)) {
            sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
          } else if (isMatched && !isCapitalized(nextWord)) {
            sourceCode.markContextRange([sourceCode.offset, sourceCode.offset + currentWord.length]);
          }
        };
        return AbbrMarker2;
      }()
    );
    exports2.AbbrMarker = AbbrMarker;
  }
});

// node_modules/sentence-splitter/lib/logger.js
var require_logger = __commonJS({
  "node_modules/sentence-splitter/lib/logger.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    function debugLog() {
      var args = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
      }
      if (process.env.DEBUG !== "sentence-splitter") {
        return;
      }
      console.log.apply(console, ["sentence-splitter: "].concat(args));
    }
    exports2.debugLog = debugLog;
  }
});

// node_modules/object-keys/isArguments.js
var require_isArguments = __commonJS({
  "node_modules/object-keys/isArguments.js"(exports2, module2) {
    "use strict";
    var toStr = Object.prototype.toString;
    module2.exports = function isArguments(value) {
      var str = toStr.call(value);
      var isArgs = str === "[object Arguments]";
      if (!isArgs) {
        isArgs = str !== "[object Array]" && value !== null && typeof value === "object" && typeof value.length === "number" && value.length >= 0 && toStr.call(value.callee) === "[object Function]";
      }
      return isArgs;
    };
  }
});

// node_modules/object-keys/index.js
var require_object_keys = __commonJS({
  "node_modules/object-keys/index.js"(exports2, module2) {
    "use strict";
    var has = Object.prototype.hasOwnProperty;
    var toStr = Object.prototype.toString;
    var slice = Array.prototype.slice;
    var isArgs = require_isArguments();
    var isEnumerable = Object.prototype.propertyIsEnumerable;
    var hasDontEnumBug = !isEnumerable.call({ toString: null }, "toString");
    var hasProtoEnumBug = isEnumerable.call(function() {
    }, "prototype");
    var dontEnums = [
      "toString",
      "toLocaleString",
      "valueOf",
      "hasOwnProperty",
      "isPrototypeOf",
      "propertyIsEnumerable",
      "constructor"
    ];
    var equalsConstructorPrototype = function(o) {
      var ctor = o.constructor;
      return ctor && ctor.prototype === o;
    };
    var excludedKeys = {
      $applicationCache: true,
      $console: true,
      $external: true,
      $frame: true,
      $frameElement: true,
      $frames: true,
      $innerHeight: true,
      $innerWidth: true,
      $outerHeight: true,
      $outerWidth: true,
      $pageXOffset: true,
      $pageYOffset: true,
      $parent: true,
      $scrollLeft: true,
      $scrollTop: true,
      $scrollX: true,
      $scrollY: true,
      $self: true,
      $webkitIndexedDB: true,
      $webkitStorageInfo: true,
      $window: true
    };
    var hasAutomationEqualityBug = function() {
      if (typeof window === "undefined") {
        return false;
      }
      for (var k in window) {
        try {
          if (!excludedKeys["$" + k] && has.call(window, k) && window[k] !== null && typeof window[k] === "object") {
            try {
              equalsConstructorPrototype(window[k]);
            } catch (e) {
              return true;
            }
          }
        } catch (e) {
          return true;
        }
      }
      return false;
    }();
    var equalsConstructorPrototypeIfNotBuggy = function(o) {
      if (typeof window === "undefined" || !hasAutomationEqualityBug) {
        return equalsConstructorPrototype(o);
      }
      try {
        return equalsConstructorPrototype(o);
      } catch (e) {
        return false;
      }
    };
    var keysShim = function keys(object) {
      var isObject = object !== null && typeof object === "object";
      var isFunction = toStr.call(object) === "[object Function]";
      var isArguments = isArgs(object);
      var isString = isObject && toStr.call(object) === "[object String]";
      var theKeys = [];
      if (!isObject && !isFunction && !isArguments) {
        throw new TypeError("Object.keys called on a non-object");
      }
      var skipProto = hasProtoEnumBug && isFunction;
      if (isString && object.length > 0 && !has.call(object, 0)) {
        for (var i = 0; i < object.length; ++i) {
          theKeys.push(String(i));
        }
      }
      if (isArguments && object.length > 0) {
        for (var j = 0; j < object.length; ++j) {
          theKeys.push(String(j));
        }
      } else {
        for (var name in object) {
          if (!(skipProto && name === "prototype") && has.call(object, name)) {
            theKeys.push(String(name));
          }
        }
      }
      if (hasDontEnumBug) {
        var skipConstructor = equalsConstructorPrototypeIfNotBuggy(object);
        for (var k = 0; k < dontEnums.length; ++k) {
          if (!(skipConstructor && dontEnums[k] === "constructor") && has.call(object, dontEnums[k])) {
            theKeys.push(dontEnums[k]);
          }
        }
      }
      return theKeys;
    };
    keysShim.shim = function shimObjectKeys() {
      if (Object.keys) {
        var keysWorksWithArguments = function() {
          return (Object.keys(arguments) || "").length === 2;
        }(1, 2);
        if (!keysWorksWithArguments) {
          var originalKeys = Object.keys;
          Object.keys = function keys(object) {
            if (isArgs(object)) {
              return originalKeys(slice.call(object));
            } else {
              return originalKeys(object);
            }
          };
        }
      } else {
        Object.keys = keysShim;
      }
      return Object.keys || keysShim;
    };
    module2.exports = keysShim;
  }
});

// node_modules/define-properties/index.js
var require_define_properties = __commonJS({
  "node_modules/define-properties/index.js"(exports2, module2) {
    "use strict";
    var keys = require_object_keys();
    var hasSymbols = typeof Symbol === "function" && typeof Symbol("foo") === "symbol";
    var toStr = Object.prototype.toString;
    var concat = Array.prototype.concat;
    var origDefineProperty = Object.defineProperty;
    var isFunction = function(fn) {
      return typeof fn === "function" && toStr.call(fn) === "[object Function]";
    };
    var arePropertyDescriptorsSupported = function() {
      var obj = {};
      try {
        origDefineProperty(obj, "x", { enumerable: false, value: obj });
        for (var _ in obj) {
          return false;
        }
        return obj.x === obj;
      } catch (e) {
        return false;
      }
    };
    var supportsDescriptors = origDefineProperty && arePropertyDescriptorsSupported();
    var defineProperty = function(object, name, value, predicate) {
      if (name in object && (!isFunction(predicate) || !predicate())) {
        return;
      }
      if (supportsDescriptors) {
        origDefineProperty(object, name, {
          configurable: true,
          enumerable: false,
          value,
          writable: true
        });
      } else {
        object[name] = value;
      }
    };
    var defineProperties = function(object, map) {
      var predicates = arguments.length > 2 ? arguments[2] : {};
      var props = keys(map);
      if (hasSymbols) {
        props = concat.call(props, Object.getOwnPropertySymbols(map));
      }
      for (var i = 0; i < props.length; i += 1) {
        defineProperty(object, props[i], map[props[i]], predicates[props[i]]);
      }
    };
    defineProperties.supportsDescriptors = !!supportsDescriptors;
    module2.exports = defineProperties;
  }
});

// node_modules/function-bind/implementation.js
var require_implementation = __commonJS({
  "node_modules/function-bind/implementation.js"(exports2, module2) {
    "use strict";
    var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ";
    var slice = Array.prototype.slice;
    var toStr = Object.prototype.toString;
    var funcType = "[object Function]";
    module2.exports = function bind(that) {
      var target = this;
      if (typeof target !== "function" || toStr.call(target) !== funcType) {
        throw new TypeError(ERROR_MESSAGE + target);
      }
      var args = slice.call(arguments, 1);
      var bound;
      var binder = function() {
        if (this instanceof bound) {
          var result = target.apply(
            this,
            args.concat(slice.call(arguments))
          );
          if (Object(result) === result) {
            return result;
          }
          return this;
        } else {
          return target.apply(
            that,
            args.concat(slice.call(arguments))
          );
        }
      };
      var boundLength = Math.max(0, target.length - args.length);
      var boundArgs = [];
      for (var i = 0; i < boundLength; i++) {
        boundArgs.push("$" + i);
      }
      bound = Function("binder", "return function (" + boundArgs.join(",") + "){ return binder.apply(this,arguments); }")(binder);
      if (target.prototype) {
        var Empty = function Empty2() {
        };
        Empty.prototype = target.prototype;
        bound.prototype = new Empty();
        Empty.prototype = null;
      }
      return bound;
    };
  }
});

// node_modules/function-bind/index.js
var require_function_bind = __commonJS({
  "node_modules/function-bind/index.js"(exports2, module2) {
    "use strict";
    var implementation = require_implementation();
    module2.exports = Function.prototype.bind || implementation;
  }
});

// node_modules/has/src/index.js
var require_src = __commonJS({
  "node_modules/has/src/index.js"(exports2, module2) {
    "use strict";
    var bind = require_function_bind();
    module2.exports = bind.call(Function.call, Object.prototype.hasOwnProperty);
  }
});

// node_modules/es-to-primitive/helpers/isPrimitive.js
var require_isPrimitive = __commonJS({
  "node_modules/es-to-primitive/helpers/isPrimitive.js"(exports2, module2) {
    module2.exports = function isPrimitive(value) {
      return value === null || typeof value !== "function" && typeof value !== "object";
    };
  }
});

// node_modules/is-callable/index.js
var require_is_callable = __commonJS({
  "node_modules/is-callable/index.js"(exports2, module2) {
    "use strict";
    var fnToStr = Function.prototype.toString;
    var constructorRegex = /^\s*class\b/;
    var isES6ClassFn = function isES6ClassFunction(value) {
      try {
        var fnStr = fnToStr.call(value);
        return constructorRegex.test(fnStr);
      } catch (e) {
        return false;
      }
    };
    var tryFunctionObject = function tryFunctionToStr(value) {
      try {
        if (isES6ClassFn(value)) {
          return false;
        }
        fnToStr.call(value);
        return true;
      } catch (e) {
        return false;
      }
    };
    var toStr = Object.prototype.toString;
    var fnClass = "[object Function]";
    var genClass = "[object GeneratorFunction]";
    var hasToStringTag = typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol";
    module2.exports = function isCallable(value) {
      if (!value) {
        return false;
      }
      if (typeof value !== "function" && typeof value !== "object") {
        return false;
      }
      if (typeof value === "function" && !value.prototype) {
        return true;
      }
      if (hasToStringTag) {
        return tryFunctionObject(value);
      }
      if (isES6ClassFn(value)) {
        return false;
      }
      var strClass = toStr.call(value);
      return strClass === fnClass || strClass === genClass;
    };
  }
});

// node_modules/is-date-object/index.js
var require_is_date_object = __commonJS({
  "node_modules/is-date-object/index.js"(exports2, module2) {
    "use strict";
    var getDay = Date.prototype.getDay;
    var tryDateObject = function tryDateObject2(value) {
      try {
        getDay.call(value);
        return true;
      } catch (e) {
        return false;
      }
    };
    var toStr = Object.prototype.toString;
    var dateClass = "[object Date]";
    var hasToStringTag = typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol";
    module2.exports = function isDateObject(value) {
      if (typeof value !== "object" || value === null) {
        return false;
      }
      return hasToStringTag ? tryDateObject(value) : toStr.call(value) === dateClass;
    };
  }
});

// node_modules/has-symbols/shams.js
var require_shams = __commonJS({
  "node_modules/has-symbols/shams.js"(exports2, module2) {
    "use strict";
    module2.exports = function hasSymbols() {
      if (typeof Symbol !== "function" || typeof Object.getOwnPropertySymbols !== "function") {
        return false;
      }
      if (typeof Symbol.iterator === "symbol") {
        return true;
      }
      var obj = {};
      var sym = Symbol("test");
      var symObj = Object(sym);
      if (typeof sym === "string") {
        return false;
      }
      if (Object.prototype.toString.call(sym) !== "[object Symbol]") {
        return false;
      }
      if (Object.prototype.toString.call(symObj) !== "[object Symbol]") {
        return false;
      }
      var symVal = 42;
      obj[sym] = symVal;
      for (sym in obj) {
        return false;
      }
      if (typeof Object.keys === "function" && Object.keys(obj).length !== 0) {
        return false;
      }
      if (typeof Object.getOwnPropertyNames === "function" && Object.getOwnPropertyNames(obj).length !== 0) {
        return false;
      }
      var syms = Object.getOwnPropertySymbols(obj);
      if (syms.length !== 1 || syms[0] !== sym) {
        return false;
      }
      if (!Object.prototype.propertyIsEnumerable.call(obj, sym)) {
        return false;
      }
      if (typeof Object.getOwnPropertyDescriptor === "function") {
        var descriptor = Object.getOwnPropertyDescriptor(obj, sym);
        if (descriptor.value !== symVal || descriptor.enumerable !== true) {
          return false;
        }
      }
      return true;
    };
  }
});

// node_modules/has-symbols/index.js
var require_has_symbols = __commonJS({
  "node_modules/has-symbols/index.js"(exports2, module2) {
    "use strict";
    var origSymbol = global.Symbol;
    var hasSymbolSham = require_shams();
    module2.exports = function hasNativeSymbols() {
      if (typeof origSymbol !== "function") {
        return false;
      }
      if (typeof Symbol !== "function") {
        return false;
      }
      if (typeof origSymbol("foo") !== "symbol") {
        return false;
      }
      if (typeof Symbol("bar") !== "symbol") {
        return false;
      }
      return hasSymbolSham();
    };
  }
});

// node_modules/is-symbol/index.js
var require_is_symbol = __commonJS({
  "node_modules/is-symbol/index.js"(exports2, module2) {
    "use strict";
    var toStr = Object.prototype.toString;
    var hasSymbols = require_has_symbols()();
    if (hasSymbols) {
      symToStr = Symbol.prototype.toString;
      symStringRegex = /^Symbol\(.*\)$/;
      isSymbolObject = function isRealSymbolObject(value) {
        if (typeof value.valueOf() !== "symbol") {
          return false;
        }
        return symStringRegex.test(symToStr.call(value));
      };
      module2.exports = function isSymbol(value) {
        if (typeof value === "symbol") {
          return true;
        }
        if (toStr.call(value) !== "[object Symbol]") {
          return false;
        }
        try {
          return isSymbolObject(value);
        } catch (e) {
          return false;
        }
      };
    } else {
      module2.exports = function isSymbol(value) {
        return false;
      };
    }
    var symToStr;
    var symStringRegex;
    var isSymbolObject;
  }
});

// node_modules/es-to-primitive/es2015.js
var require_es2015 = __commonJS({
  "node_modules/es-to-primitive/es2015.js"(exports2, module2) {
    "use strict";
    var hasSymbols = typeof Symbol === "function" && typeof Symbol.iterator === "symbol";
    var isPrimitive = require_isPrimitive();
    var isCallable = require_is_callable();
    var isDate = require_is_date_object();
    var isSymbol = require_is_symbol();
    var ordinaryToPrimitive = function OrdinaryToPrimitive(O, hint) {
      if (typeof O === "undefined" || O === null) {
        throw new TypeError("Cannot call method on " + O);
      }
      if (typeof hint !== "string" || hint !== "number" && hint !== "string") {
        throw new TypeError('hint must be "string" or "number"');
      }
      var methodNames = hint === "string" ? ["toString", "valueOf"] : ["valueOf", "toString"];
      var method, result, i;
      for (i = 0; i < methodNames.length; ++i) {
        method = O[methodNames[i]];
        if (isCallable(method)) {
          result = method.call(O);
          if (isPrimitive(result)) {
            return result;
          }
        }
      }
      throw new TypeError("No default value");
    };
    var GetMethod = function GetMethod2(O, P) {
      var func = O[P];
      if (func !== null && typeof func !== "undefined") {
        if (!isCallable(func)) {
          throw new TypeError(func + " returned for property " + P + " of object " + O + " is not a function");
        }
        return func;
      }
      return void 0;
    };
    module2.exports = function ToPrimitive(input) {
      if (isPrimitive(input)) {
        return input;
      }
      var hint = "default";
      if (arguments.length > 1) {
        if (arguments[1] === String) {
          hint = "string";
        } else if (arguments[1] === Number) {
          hint = "number";
        }
      }
      var exoticToPrim;
      if (hasSymbols) {
        if (Symbol.toPrimitive) {
          exoticToPrim = GetMethod(input, Symbol.toPrimitive);
        } else if (isSymbol(input)) {
          exoticToPrim = Symbol.prototype.valueOf;
        }
      }
      if (typeof exoticToPrim !== "undefined") {
        var result = exoticToPrim.call(input, hint);
        if (isPrimitive(result)) {
          return result;
        }
        throw new TypeError("unable to convert exotic object to primitive");
      }
      if (hint === "default" && (isDate(input) || isSymbol(input))) {
        hint = "string";
      }
      return ordinaryToPrimitive(input, hint === "default" ? "number" : hint);
    };
  }
});

// node_modules/es-to-primitive/es6.js
var require_es6 = __commonJS({
  "node_modules/es-to-primitive/es6.js"(exports2, module2) {
    "use strict";
    module2.exports = require_es2015();
  }
});

// node_modules/es-abstract/GetIntrinsic.js
var require_GetIntrinsic = __commonJS({
  "node_modules/es-abstract/GetIntrinsic.js"(exports2, module2) {
    "use strict";
    var undefined2;
    var ThrowTypeError = Object.getOwnPropertyDescriptor ? function() {
      return Object.getOwnPropertyDescriptor(arguments, "callee").get;
    }() : function() {
      throw new TypeError();
    };
    var hasSymbols = typeof Symbol === "function" && typeof Symbol.iterator === "symbol";
    var getProto = Object.getPrototypeOf || function(x) {
      return x.__proto__;
    };
    var generator;
    var generatorFunction = generator ? getProto(generator) : undefined2;
    var asyncFn;
    var asyncFunction = asyncFn ? asyncFn.constructor : undefined2;
    var asyncGen;
    var asyncGenFunction = asyncGen ? getProto(asyncGen) : undefined2;
    var asyncGenIterator = asyncGen ? asyncGen() : undefined2;
    var TypedArray = typeof Uint8Array === "undefined" ? undefined2 : getProto(Uint8Array);
    var INTRINSICS = {
      "$ %Array%": Array,
      "$ %ArrayBuffer%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer,
      "$ %ArrayBufferPrototype%": typeof ArrayBuffer === "undefined" ? undefined2 : ArrayBuffer.prototype,
      "$ %ArrayIteratorPrototype%": hasSymbols ? getProto([][Symbol.iterator]()) : undefined2,
      "$ %ArrayPrototype%": Array.prototype,
      "$ %ArrayProto_entries%": Array.prototype.entries,
      "$ %ArrayProto_forEach%": Array.prototype.forEach,
      "$ %ArrayProto_keys%": Array.prototype.keys,
      "$ %ArrayProto_values%": Array.prototype.values,
      "$ %AsyncFromSyncIteratorPrototype%": undefined2,
      "$ %AsyncFunction%": asyncFunction,
      "$ %AsyncFunctionPrototype%": asyncFunction ? asyncFunction.prototype : undefined2,
      "$ %AsyncGenerator%": asyncGen ? getProto(asyncGenIterator) : undefined2,
      "$ %AsyncGeneratorFunction%": asyncGenFunction,
      "$ %AsyncGeneratorPrototype%": asyncGenFunction ? asyncGenFunction.prototype : undefined2,
      "$ %AsyncIteratorPrototype%": asyncGenIterator && hasSymbols && Symbol.asyncIterator ? asyncGenIterator[Symbol.asyncIterator]() : undefined2,
      "$ %Atomics%": typeof Atomics === "undefined" ? undefined2 : Atomics,
      "$ %Boolean%": Boolean,
      "$ %BooleanPrototype%": Boolean.prototype,
      "$ %DataView%": typeof DataView === "undefined" ? undefined2 : DataView,
      "$ %DataViewPrototype%": typeof DataView === "undefined" ? undefined2 : DataView.prototype,
      "$ %Date%": Date,
      "$ %DatePrototype%": Date.prototype,
      "$ %decodeURI%": decodeURI,
      "$ %decodeURIComponent%": decodeURIComponent,
      "$ %encodeURI%": encodeURI,
      "$ %encodeURIComponent%": encodeURIComponent,
      "$ %Error%": Error,
      "$ %ErrorPrototype%": Error.prototype,
      "$ %eval%": eval,
      // eslint-disable-line no-eval
      "$ %EvalError%": EvalError,
      "$ %EvalErrorPrototype%": EvalError.prototype,
      "$ %Float32Array%": typeof Float32Array === "undefined" ? undefined2 : Float32Array,
      "$ %Float32ArrayPrototype%": typeof Float32Array === "undefined" ? undefined2 : Float32Array.prototype,
      "$ %Float64Array%": typeof Float64Array === "undefined" ? undefined2 : Float64Array,
      "$ %Float64ArrayPrototype%": typeof Float64Array === "undefined" ? undefined2 : Float64Array.prototype,
      "$ %Function%": Function,
      "$ %FunctionPrototype%": Function.prototype,
      "$ %Generator%": generator ? getProto(generator()) : undefined2,
      "$ %GeneratorFunction%": generatorFunction,
      "$ %GeneratorPrototype%": generatorFunction ? generatorFunction.prototype : undefined2,
      "$ %Int8Array%": typeof Int8Array === "undefined" ? undefined2 : Int8Array,
      "$ %Int8ArrayPrototype%": typeof Int8Array === "undefined" ? undefined2 : Int8Array.prototype,
      "$ %Int16Array%": typeof Int16Array === "undefined" ? undefined2 : Int16Array,
      "$ %Int16ArrayPrototype%": typeof Int16Array === "undefined" ? undefined2 : Int8Array.prototype,
      "$ %Int32Array%": typeof Int32Array === "undefined" ? undefined2 : Int32Array,
      "$ %Int32ArrayPrototype%": typeof Int32Array === "undefined" ? undefined2 : Int32Array.prototype,
      "$ %isFinite%": isFinite,
      "$ %isNaN%": isNaN,
      "$ %IteratorPrototype%": hasSymbols ? getProto(getProto([][Symbol.iterator]())) : undefined2,
      "$ %JSON%": JSON,
      "$ %JSONParse%": JSON.parse,
      "$ %Map%": typeof Map === "undefined" ? undefined2 : Map,
      "$ %MapIteratorPrototype%": typeof Map === "undefined" || !hasSymbols ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
      "$ %MapPrototype%": typeof Map === "undefined" ? undefined2 : Map.prototype,
      "$ %Math%": Math,
      "$ %Number%": Number,
      "$ %NumberPrototype%": Number.prototype,
      "$ %Object%": Object,
      "$ %ObjectPrototype%": Object.prototype,
      "$ %ObjProto_toString%": Object.prototype.toString,
      "$ %ObjProto_valueOf%": Object.prototype.valueOf,
      "$ %parseFloat%": parseFloat,
      "$ %parseInt%": parseInt,
      "$ %Promise%": typeof Promise === "undefined" ? undefined2 : Promise,
      "$ %PromisePrototype%": typeof Promise === "undefined" ? undefined2 : Promise.prototype,
      "$ %PromiseProto_then%": typeof Promise === "undefined" ? undefined2 : Promise.prototype.then,
      "$ %Promise_all%": typeof Promise === "undefined" ? undefined2 : Promise.all,
      "$ %Promise_reject%": typeof Promise === "undefined" ? undefined2 : Promise.reject,
      "$ %Promise_resolve%": typeof Promise === "undefined" ? undefined2 : Promise.resolve,
      "$ %Proxy%": typeof Proxy === "undefined" ? undefined2 : Proxy,
      "$ %RangeError%": RangeError,
      "$ %RangeErrorPrototype%": RangeError.prototype,
      "$ %ReferenceError%": ReferenceError,
      "$ %ReferenceErrorPrototype%": ReferenceError.prototype,
      "$ %Reflect%": typeof Reflect === "undefined" ? undefined2 : Reflect,
      "$ %RegExp%": RegExp,
      "$ %RegExpPrototype%": RegExp.prototype,
      "$ %Set%": typeof Set === "undefined" ? undefined2 : Set,
      "$ %SetIteratorPrototype%": typeof Set === "undefined" || !hasSymbols ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
      "$ %SetPrototype%": typeof Set === "undefined" ? undefined2 : Set.prototype,
      "$ %SharedArrayBuffer%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer,
      "$ %SharedArrayBufferPrototype%": typeof SharedArrayBuffer === "undefined" ? undefined2 : SharedArrayBuffer.prototype,
      "$ %String%": String,
      "$ %StringIteratorPrototype%": hasSymbols ? getProto(""[Symbol.iterator]()) : undefined2,
      "$ %StringPrototype%": String.prototype,
      "$ %Symbol%": hasSymbols ? Symbol : undefined2,
      "$ %SymbolPrototype%": hasSymbols ? Symbol.prototype : undefined2,
      "$ %SyntaxError%": SyntaxError,
      "$ %SyntaxErrorPrototype%": SyntaxError.prototype,
      "$ %ThrowTypeError%": ThrowTypeError,
      "$ %TypedArray%": TypedArray,
      "$ %TypedArrayPrototype%": TypedArray ? TypedArray.prototype : undefined2,
      "$ %TypeError%": TypeError,
      "$ %TypeErrorPrototype%": TypeError.prototype,
      "$ %Uint8Array%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array,
      "$ %Uint8ArrayPrototype%": typeof Uint8Array === "undefined" ? undefined2 : Uint8Array.prototype,
      "$ %Uint8ClampedArray%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray,
      "$ %Uint8ClampedArrayPrototype%": typeof Uint8ClampedArray === "undefined" ? undefined2 : Uint8ClampedArray.prototype,
      "$ %Uint16Array%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array,
      "$ %Uint16ArrayPrototype%": typeof Uint16Array === "undefined" ? undefined2 : Uint16Array.prototype,
      "$ %Uint32Array%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array,
      "$ %Uint32ArrayPrototype%": typeof Uint32Array === "undefined" ? undefined2 : Uint32Array.prototype,
      "$ %URIError%": URIError,
      "$ %URIErrorPrototype%": URIError.prototype,
      "$ %WeakMap%": typeof WeakMap === "undefined" ? undefined2 : WeakMap,
      "$ %WeakMapPrototype%": typeof WeakMap === "undefined" ? undefined2 : WeakMap.prototype,
      "$ %WeakSet%": typeof WeakSet === "undefined" ? undefined2 : WeakSet,
      "$ %WeakSetPrototype%": typeof WeakSet === "undefined" ? undefined2 : WeakSet.prototype
    };
    module2.exports = function GetIntrinsic(name, allowMissing) {
      if (arguments.length > 1 && typeof allowMissing !== "boolean") {
        throw new TypeError('"allowMissing" argument must be a boolean');
      }
      var key = "$ " + name;
      if (!(key in INTRINSICS)) {
        throw new SyntaxError("intrinsic " + name + " does not exist!");
      }
      if (typeof INTRINSICS[key] === "undefined" && !allowMissing) {
        throw new TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
      }
      return INTRINSICS[key];
    };
  }
});

// node_modules/es-abstract/helpers/isNaN.js
var require_isNaN = __commonJS({
  "node_modules/es-abstract/helpers/isNaN.js"(exports2, module2) {
    module2.exports = Number.isNaN || function isNaN2(a) {
      return a !== a;
    };
  }
});

// node_modules/es-abstract/helpers/isFinite.js
var require_isFinite = __commonJS({
  "node_modules/es-abstract/helpers/isFinite.js"(exports2, module2) {
    var $isNaN = Number.isNaN || function(a) {
      return a !== a;
    };
    module2.exports = Number.isFinite || function(x) {
      return typeof x === "number" && !$isNaN(x) && x !== Infinity && x !== -Infinity;
    };
  }
});

// node_modules/es-abstract/helpers/assign.js
var require_assign = __commonJS({
  "node_modules/es-abstract/helpers/assign.js"(exports2, module2) {
    var bind = require_function_bind();
    var has = bind.call(Function.call, Object.prototype.hasOwnProperty);
    var $assign = Object.assign;
    module2.exports = function assign(target, source) {
      if ($assign) {
        return $assign(target, source);
      }
      for (var key in source) {
        if (has(source, key)) {
          target[key] = source[key];
        }
      }
      return target;
    };
  }
});

// node_modules/es-abstract/helpers/sign.js
var require_sign = __commonJS({
  "node_modules/es-abstract/helpers/sign.js"(exports2, module2) {
    module2.exports = function sign(number) {
      return number >= 0 ? 1 : -1;
    };
  }
});

// node_modules/es-abstract/helpers/mod.js
var require_mod = __commonJS({
  "node_modules/es-abstract/helpers/mod.js"(exports2, module2) {
    module2.exports = function mod(number, modulo) {
      var remain = number % modulo;
      return Math.floor(remain >= 0 ? remain : remain + modulo);
    };
  }
});

// node_modules/es-abstract/helpers/isPrimitive.js
var require_isPrimitive2 = __commonJS({
  "node_modules/es-abstract/helpers/isPrimitive.js"(exports2, module2) {
    module2.exports = function isPrimitive(value) {
      return value === null || typeof value !== "function" && typeof value !== "object";
    };
  }
});

// node_modules/es-to-primitive/es5.js
var require_es5 = __commonJS({
  "node_modules/es-to-primitive/es5.js"(exports2, module2) {
    "use strict";
    var toStr = Object.prototype.toString;
    var isPrimitive = require_isPrimitive();
    var isCallable = require_is_callable();
    var ES5internalSlots = {
      "[[DefaultValue]]": function(O) {
        var actualHint;
        if (arguments.length > 1) {
          actualHint = arguments[1];
        } else {
          actualHint = toStr.call(O) === "[object Date]" ? String : Number;
        }
        if (actualHint === String || actualHint === Number) {
          var methods = actualHint === String ? ["toString", "valueOf"] : ["valueOf", "toString"];
          var value, i;
          for (i = 0; i < methods.length; ++i) {
            if (isCallable(O[methods[i]])) {
              value = O[methods[i]]();
              if (isPrimitive(value)) {
                return value;
              }
            }
          }
          throw new TypeError("No default value");
        }
        throw new TypeError("invalid [[DefaultValue]] hint supplied");
      }
    };
    module2.exports = function ToPrimitive(input) {
      if (isPrimitive(input)) {
        return input;
      }
      if (arguments.length > 1) {
        return ES5internalSlots["[[DefaultValue]]"](input, arguments[1]);
      }
      return ES5internalSlots["[[DefaultValue]]"](input);
    };
  }
});

// node_modules/es-abstract/es5.js
var require_es52 = __commonJS({
  "node_modules/es-abstract/es5.js"(exports2, module2) {
    "use strict";
    var GetIntrinsic = require_GetIntrinsic();
    var $Object = GetIntrinsic("%Object%");
    var $TypeError = GetIntrinsic("%TypeError%");
    var $String = GetIntrinsic("%String%");
    var $isNaN = require_isNaN();
    var $isFinite = require_isFinite();
    var sign = require_sign();
    var mod = require_mod();
    var IsCallable = require_is_callable();
    var toPrimitive = require_es5();
    var has = require_src();
    var ES5 = {
      ToPrimitive: toPrimitive,
      ToBoolean: function ToBoolean(value) {
        return !!value;
      },
      ToNumber: function ToNumber(value) {
        return +value;
      },
      ToInteger: function ToInteger(value) {
        var number = this.ToNumber(value);
        if ($isNaN(number)) {
          return 0;
        }
        if (number === 0 || !$isFinite(number)) {
          return number;
        }
        return sign(number) * Math.floor(Math.abs(number));
      },
      ToInt32: function ToInt32(x) {
        return this.ToNumber(x) >> 0;
      },
      ToUint32: function ToUint32(x) {
        return this.ToNumber(x) >>> 0;
      },
      ToUint16: function ToUint16(value) {
        var number = this.ToNumber(value);
        if ($isNaN(number) || number === 0 || !$isFinite(number)) {
          return 0;
        }
        var posInt = sign(number) * Math.floor(Math.abs(number));
        return mod(posInt, 65536);
      },
      ToString: function ToString(value) {
        return $String(value);
      },
      ToObject: function ToObject(value) {
        this.CheckObjectCoercible(value);
        return $Object(value);
      },
      CheckObjectCoercible: function CheckObjectCoercible(value, optMessage) {
        if (value == null) {
          throw new $TypeError(optMessage || "Cannot call method on " + value);
        }
        return value;
      },
      IsCallable,
      SameValue: function SameValue(x, y) {
        if (x === y) {
          if (x === 0) {
            return 1 / x === 1 / y;
          }
          return true;
        }
        return $isNaN(x) && $isNaN(y);
      },
      // https://www.ecma-international.org/ecma-262/5.1/#sec-8
      Type: function Type(x) {
        if (x === null) {
          return "Null";
        }
        if (typeof x === "undefined") {
          return "Undefined";
        }
        if (typeof x === "function" || typeof x === "object") {
          return "Object";
        }
        if (typeof x === "number") {
          return "Number";
        }
        if (typeof x === "boolean") {
          return "Boolean";
        }
        if (typeof x === "string") {
          return "String";
        }
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-property-descriptor-specification-type
      IsPropertyDescriptor: function IsPropertyDescriptor(Desc) {
        if (this.Type(Desc) !== "Object") {
          return false;
        }
        var allowed = {
          "[[Configurable]]": true,
          "[[Enumerable]]": true,
          "[[Get]]": true,
          "[[Set]]": true,
          "[[Value]]": true,
          "[[Writable]]": true
        };
        for (var key in Desc) {
          if (has(Desc, key) && !allowed[key]) {
            return false;
          }
        }
        var isData = has(Desc, "[[Value]]");
        var IsAccessor = has(Desc, "[[Get]]") || has(Desc, "[[Set]]");
        if (isData && IsAccessor) {
          throw new $TypeError("Property Descriptors may not be both accessor and data descriptors");
        }
        return true;
      },
      // https://ecma-international.org/ecma-262/5.1/#sec-8.10.1
      IsAccessorDescriptor: function IsAccessorDescriptor(Desc) {
        if (typeof Desc === "undefined") {
          return false;
        }
        if (!this.IsPropertyDescriptor(Desc)) {
          throw new $TypeError("Desc must be a Property Descriptor");
        }
        if (!has(Desc, "[[Get]]") && !has(Desc, "[[Set]]")) {
          return false;
        }
        return true;
      },
      // https://ecma-international.org/ecma-262/5.1/#sec-8.10.2
      IsDataDescriptor: function IsDataDescriptor(Desc) {
        if (typeof Desc === "undefined") {
          return false;
        }
        if (!this.IsPropertyDescriptor(Desc)) {
          throw new $TypeError("Desc must be a Property Descriptor");
        }
        if (!has(Desc, "[[Value]]") && !has(Desc, "[[Writable]]")) {
          return false;
        }
        return true;
      },
      // https://ecma-international.org/ecma-262/5.1/#sec-8.10.3
      IsGenericDescriptor: function IsGenericDescriptor(Desc) {
        if (typeof Desc === "undefined") {
          return false;
        }
        if (!this.IsPropertyDescriptor(Desc)) {
          throw new $TypeError("Desc must be a Property Descriptor");
        }
        if (!this.IsAccessorDescriptor(Desc) && !this.IsDataDescriptor(Desc)) {
          return true;
        }
        return false;
      },
      // https://ecma-international.org/ecma-262/5.1/#sec-8.10.4
      FromPropertyDescriptor: function FromPropertyDescriptor(Desc) {
        if (typeof Desc === "undefined") {
          return Desc;
        }
        if (!this.IsPropertyDescriptor(Desc)) {
          throw new $TypeError("Desc must be a Property Descriptor");
        }
        if (this.IsDataDescriptor(Desc)) {
          return {
            value: Desc["[[Value]]"],
            writable: !!Desc["[[Writable]]"],
            enumerable: !!Desc["[[Enumerable]]"],
            configurable: !!Desc["[[Configurable]]"]
          };
        } else if (this.IsAccessorDescriptor(Desc)) {
          return {
            get: Desc["[[Get]]"],
            set: Desc["[[Set]]"],
            enumerable: !!Desc["[[Enumerable]]"],
            configurable: !!Desc["[[Configurable]]"]
          };
        } else {
          throw new $TypeError("FromPropertyDescriptor must be called with a fully populated Property Descriptor");
        }
      },
      // https://ecma-international.org/ecma-262/5.1/#sec-8.10.5
      ToPropertyDescriptor: function ToPropertyDescriptor(Obj) {
        if (this.Type(Obj) !== "Object") {
          throw new $TypeError("ToPropertyDescriptor requires an object");
        }
        var desc = {};
        if (has(Obj, "enumerable")) {
          desc["[[Enumerable]]"] = this.ToBoolean(Obj.enumerable);
        }
        if (has(Obj, "configurable")) {
          desc["[[Configurable]]"] = this.ToBoolean(Obj.configurable);
        }
        if (has(Obj, "value")) {
          desc["[[Value]]"] = Obj.value;
        }
        if (has(Obj, "writable")) {
          desc["[[Writable]]"] = this.ToBoolean(Obj.writable);
        }
        if (has(Obj, "get")) {
          var getter = Obj.get;
          if (typeof getter !== "undefined" && !this.IsCallable(getter)) {
            throw new TypeError("getter must be a function");
          }
          desc["[[Get]]"] = getter;
        }
        if (has(Obj, "set")) {
          var setter = Obj.set;
          if (typeof setter !== "undefined" && !this.IsCallable(setter)) {
            throw new $TypeError("setter must be a function");
          }
          desc["[[Set]]"] = setter;
        }
        if ((has(desc, "[[Get]]") || has(desc, "[[Set]]")) && (has(desc, "[[Value]]") || has(desc, "[[Writable]]"))) {
          throw new $TypeError("Invalid property descriptor. Cannot both specify accessors and a value or writable attribute");
        }
        return desc;
      }
    };
    module2.exports = ES5;
  }
});

// node_modules/is-regex/index.js
var require_is_regex = __commonJS({
  "node_modules/is-regex/index.js"(exports2, module2) {
    "use strict";
    var has = require_src();
    var regexExec = RegExp.prototype.exec;
    var gOPD = Object.getOwnPropertyDescriptor;
    var tryRegexExecCall = function tryRegexExec(value) {
      try {
        var lastIndex = value.lastIndex;
        value.lastIndex = 0;
        regexExec.call(value);
        return true;
      } catch (e) {
        return false;
      } finally {
        value.lastIndex = lastIndex;
      }
    };
    var toStr = Object.prototype.toString;
    var regexClass = "[object RegExp]";
    var hasToStringTag = typeof Symbol === "function" && typeof Symbol.toStringTag === "symbol";
    module2.exports = function isRegex(value) {
      if (!value || typeof value !== "object") {
        return false;
      }
      if (!hasToStringTag) {
        return toStr.call(value) === regexClass;
      }
      var descriptor = gOPD(value, "lastIndex");
      var hasLastIndexDataProperty = descriptor && has(descriptor, "value");
      if (!hasLastIndexDataProperty) {
        return false;
      }
      return tryRegexExecCall(value);
    };
  }
});

// node_modules/es-abstract/es2015.js
var require_es20152 = __commonJS({
  "node_modules/es-abstract/es2015.js"(exports2, module2) {
    "use strict";
    var has = require_src();
    var toPrimitive = require_es6();
    var GetIntrinsic = require_GetIntrinsic();
    var $TypeError = GetIntrinsic("%TypeError%");
    var $SyntaxError = GetIntrinsic("%SyntaxError%");
    var $Array = GetIntrinsic("%Array%");
    var $String = GetIntrinsic("%String%");
    var $Object = GetIntrinsic("%Object%");
    var $Number = GetIntrinsic("%Number%");
    var $Symbol = GetIntrinsic("%Symbol%", true);
    var $RegExp = GetIntrinsic("%RegExp%");
    var hasSymbols = !!$Symbol;
    var $isNaN = require_isNaN();
    var $isFinite = require_isFinite();
    var MAX_SAFE_INTEGER = $Number.MAX_SAFE_INTEGER || Math.pow(2, 53) - 1;
    var assign = require_assign();
    var sign = require_sign();
    var mod = require_mod();
    var isPrimitive = require_isPrimitive2();
    var parseInteger = parseInt;
    var bind = require_function_bind();
    var arraySlice = bind.call(Function.call, $Array.prototype.slice);
    var strSlice = bind.call(Function.call, $String.prototype.slice);
    var isBinary = bind.call(Function.call, $RegExp.prototype.test, /^0b[01]+$/i);
    var isOctal = bind.call(Function.call, $RegExp.prototype.test, /^0o[0-7]+$/i);
    var regexExec = bind.call(Function.call, $RegExp.prototype.exec);
    var nonWS = ["\x85", "\u200B", "\uFFFE"].join("");
    var nonWSregex = new $RegExp("[" + nonWS + "]", "g");
    var hasNonWS = bind.call(Function.call, $RegExp.prototype.test, nonWSregex);
    var invalidHexLiteral = /^[-+]0x[0-9a-f]+$/i;
    var isInvalidHexLiteral = bind.call(Function.call, $RegExp.prototype.test, invalidHexLiteral);
    var $charCodeAt = bind.call(Function.call, $String.prototype.charCodeAt);
    var toStr = bind.call(Function.call, Object.prototype.toString);
    var $floor = Math.floor;
    var $abs = Math.abs;
    var $ObjectCreate = Object.create;
    var $gOPD = $Object.getOwnPropertyDescriptor;
    var $isExtensible = $Object.isExtensible;
    var ws = [
      "	\n\v\f\r \xA0\u1680\u180E\u2000\u2001\u2002\u2003",
      "\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\u2028",
      "\u2029\uFEFF"
    ].join("");
    var trimRegex = new RegExp("(^[" + ws + "]+)|([" + ws + "]+$)", "g");
    var replace = bind.call(Function.call, $String.prototype.replace);
    var trim = function(value) {
      return replace(value, trimRegex, "");
    };
    var ES5 = require_es52();
    var hasRegExpMatcher = require_is_regex();
    var ES6 = assign(assign({}, ES5), {
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-call-f-v-args
      Call: function Call(F, V) {
        var args = arguments.length > 2 ? arguments[2] : [];
        if (!this.IsCallable(F)) {
          throw new $TypeError(F + " is not a function");
        }
        return F.apply(V, args);
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toprimitive
      ToPrimitive: toPrimitive,
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toboolean
      // ToBoolean: ES5.ToBoolean,
      // https://ecma-international.org/ecma-262/6.0/#sec-tonumber
      ToNumber: function ToNumber(argument) {
        var value = isPrimitive(argument) ? argument : toPrimitive(argument, $Number);
        if (typeof value === "symbol") {
          throw new $TypeError("Cannot convert a Symbol value to a number");
        }
        if (typeof value === "string") {
          if (isBinary(value)) {
            return this.ToNumber(parseInteger(strSlice(value, 2), 2));
          } else if (isOctal(value)) {
            return this.ToNumber(parseInteger(strSlice(value, 2), 8));
          } else if (hasNonWS(value) || isInvalidHexLiteral(value)) {
            return NaN;
          } else {
            var trimmed = trim(value);
            if (trimmed !== value) {
              return this.ToNumber(trimmed);
            }
          }
        }
        return $Number(value);
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tointeger
      // ToInteger: ES5.ToNumber,
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toint32
      // ToInt32: ES5.ToInt32,
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint32
      // ToUint32: ES5.ToUint32,
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toint16
      ToInt16: function ToInt16(argument) {
        var int16bit = this.ToUint16(argument);
        return int16bit >= 32768 ? int16bit - 65536 : int16bit;
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint16
      // ToUint16: ES5.ToUint16,
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toint8
      ToInt8: function ToInt8(argument) {
        var int8bit = this.ToUint8(argument);
        return int8bit >= 128 ? int8bit - 256 : int8bit;
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint8
      ToUint8: function ToUint8(argument) {
        var number = this.ToNumber(argument);
        if ($isNaN(number) || number === 0 || !$isFinite(number)) {
          return 0;
        }
        var posInt = sign(number) * $floor($abs(number));
        return mod(posInt, 256);
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-touint8clamp
      ToUint8Clamp: function ToUint8Clamp(argument) {
        var number = this.ToNumber(argument);
        if ($isNaN(number) || number <= 0) {
          return 0;
        }
        if (number >= 255) {
          return 255;
        }
        var f = $floor(argument);
        if (f + 0.5 < number) {
          return f + 1;
        }
        if (number < f + 0.5) {
          return f;
        }
        if (f % 2 !== 0) {
          return f + 1;
        }
        return f;
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tostring
      ToString: function ToString(argument) {
        if (typeof argument === "symbol") {
          throw new $TypeError("Cannot convert a Symbol value to a string");
        }
        return $String(argument);
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-toobject
      ToObject: function ToObject(value) {
        this.RequireObjectCoercible(value);
        return $Object(value);
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-topropertykey
      ToPropertyKey: function ToPropertyKey(argument) {
        var key = this.ToPrimitive(argument, $String);
        return typeof key === "symbol" ? key : this.ToString(key);
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-tolength
      ToLength: function ToLength(argument) {
        var len = this.ToInteger(argument);
        if (len <= 0) {
          return 0;
        }
        if (len > MAX_SAFE_INTEGER) {
          return MAX_SAFE_INTEGER;
        }
        return len;
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-canonicalnumericindexstring
      CanonicalNumericIndexString: function CanonicalNumericIndexString(argument) {
        if (toStr(argument) !== "[object String]") {
          throw new $TypeError("must be a string");
        }
        if (argument === "-0") {
          return -0;
        }
        var n = this.ToNumber(argument);
        if (this.SameValue(this.ToString(n), argument)) {
          return n;
        }
        return void 0;
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-requireobjectcoercible
      RequireObjectCoercible: ES5.CheckObjectCoercible,
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isarray
      IsArray: $Array.isArray || function IsArray(argument) {
        return toStr(argument) === "[object Array]";
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-iscallable
      // IsCallable: ES5.IsCallable,
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isconstructor
      IsConstructor: function IsConstructor(argument) {
        return typeof argument === "function" && !!argument.prototype;
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isextensible-o
      IsExtensible: Object.preventExtensions ? function IsExtensible(obj) {
        if (isPrimitive(obj)) {
          return false;
        }
        return $isExtensible(obj);
      } : function isExtensible(obj) {
        return true;
      },
      // eslint-disable-line no-unused-vars
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-isinteger
      IsInteger: function IsInteger(argument) {
        if (typeof argument !== "number" || $isNaN(argument) || !$isFinite(argument)) {
          return false;
        }
        var abs = $abs(argument);
        return $floor(abs) === abs;
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-ispropertykey
      IsPropertyKey: function IsPropertyKey(argument) {
        return typeof argument === "string" || typeof argument === "symbol";
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-isregexp
      IsRegExp: function IsRegExp(argument) {
        if (!argument || typeof argument !== "object") {
          return false;
        }
        if (hasSymbols) {
          var isRegExp = argument[$Symbol.match];
          if (typeof isRegExp !== "undefined") {
            return ES5.ToBoolean(isRegExp);
          }
        }
        return hasRegExpMatcher(argument);
      },
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevalue
      // SameValue: ES5.SameValue,
      // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-samevaluezero
      SameValueZero: function SameValueZero(x, y) {
        return x === y || $isNaN(x) && $isNaN(y);
      },
      /**
       * 7.3.2 GetV (V, P)
       * 1. Assert: IsPropertyKey(P) is true.
       * 2. Let O be ToObject(V).
       * 3. ReturnIfAbrupt(O).
       * 4. Return O.[[Get]](P, V).
       */
      GetV: function GetV(V, P) {
        if (!this.IsPropertyKey(P)) {
          throw new $TypeError("Assertion failed: IsPropertyKey(P) is not true");
        }
        var O = this.ToObject(V);
        return O[P];
      },
      /**
       * 7.3.9 - https://ecma-international.org/ecma-262/6.0/#sec-getmethod
       * 1. Assert: IsPropertyKey(P) is true.
       * 2. Let func be GetV(O, P).
       * 3. ReturnIfAbrupt(func).
       * 4. If func is either undefined or null, return undefined.
       * 5. If IsCallable(func) is false, throw a TypeError exception.
       * 6. Return func.
       */
      GetMethod: function GetMethod(O, P) {
        if (!this.IsPropertyKey(P)) {
          throw new $TypeError("Assertion failed: IsPropertyKey(P) is not true");
        }
        var func = this.GetV(O, P);
        if (func == null) {
          return void 0;
        }
        if (!this.IsCallable(func)) {
          throw new $TypeError(P + "is not a function");
        }
        return func;
      },
      /**
       * 7.3.1 Get (O, P) - https://ecma-international.org/ecma-262/6.0/#sec-get-o-p
       * 1. Assert: Type(O) is Object.
       * 2. Assert: IsPropertyKey(P) is true.
       * 3. Return O.[[Get]](P, O).
       */
      Get: function Get(O, P) {
        if (this.Type(O) !== "Object") {
          throw new $TypeError("Assertion failed: Type(O) is not Object");
        }
        if (!this.IsPropertyKey(P)) {
          throw new $TypeError("Assertion failed: IsPropertyKey(P) is not true");
        }
        return O[P];
      },
      Type: function Type(x) {
        if (typeof x === "symbol") {
          return "Symbol";
        }
        return ES5.Type(x);
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-speciesconstructor
      SpeciesConstructor: function SpeciesConstructor(O, defaultConstructor) {
        if (this.Type(O) !== "Object") {
          throw new $TypeError("Assertion failed: Type(O) is not Object");
        }
        var C = O.constructor;
        if (typeof C === "undefined") {
          return defaultConstructor;
        }
        if (this.Type(C) !== "Object") {
          throw new $TypeError("O.constructor is not an Object");
        }
        var S = hasSymbols && $Symbol.species ? C[$Symbol.species] : void 0;
        if (S == null) {
          return defaultConstructor;
        }
        if (this.IsConstructor(S)) {
          return S;
        }
        throw new $TypeError("no constructor found");
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-completepropertydescriptor
      CompletePropertyDescriptor: function CompletePropertyDescriptor(Desc) {
        if (!this.IsPropertyDescriptor(Desc)) {
          throw new $TypeError("Desc must be a Property Descriptor");
        }
        if (this.IsGenericDescriptor(Desc) || this.IsDataDescriptor(Desc)) {
          if (!has(Desc, "[[Value]]")) {
            Desc["[[Value]]"] = void 0;
          }
          if (!has(Desc, "[[Writable]]")) {
            Desc["[[Writable]]"] = false;
          }
        } else {
          if (!has(Desc, "[[Get]]")) {
            Desc["[[Get]]"] = void 0;
          }
          if (!has(Desc, "[[Set]]")) {
            Desc["[[Set]]"] = void 0;
          }
        }
        if (!has(Desc, "[[Enumerable]]")) {
          Desc["[[Enumerable]]"] = false;
        }
        if (!has(Desc, "[[Configurable]]")) {
          Desc["[[Configurable]]"] = false;
        }
        return Desc;
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-set-o-p-v-throw
      Set: function Set2(O, P, V, Throw) {
        if (this.Type(O) !== "Object") {
          throw new $TypeError("O must be an Object");
        }
        if (!this.IsPropertyKey(P)) {
          throw new $TypeError("P must be a Property Key");
        }
        if (this.Type(Throw) !== "Boolean") {
          throw new $TypeError("Throw must be a Boolean");
        }
        if (Throw) {
          O[P] = V;
          return true;
        } else {
          try {
            O[P] = V;
          } catch (e) {
            return false;
          }
        }
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-hasownproperty
      HasOwnProperty: function HasOwnProperty(O, P) {
        if (this.Type(O) !== "Object") {
          throw new $TypeError("O must be an Object");
        }
        if (!this.IsPropertyKey(P)) {
          throw new $TypeError("P must be a Property Key");
        }
        return has(O, P);
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-hasproperty
      HasProperty: function HasProperty(O, P) {
        if (this.Type(O) !== "Object") {
          throw new $TypeError("O must be an Object");
        }
        if (!this.IsPropertyKey(P)) {
          throw new $TypeError("P must be a Property Key");
        }
        return P in O;
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-isconcatspreadable
      IsConcatSpreadable: function IsConcatSpreadable(O) {
        if (this.Type(O) !== "Object") {
          return false;
        }
        if (hasSymbols && typeof $Symbol.isConcatSpreadable === "symbol") {
          var spreadable = this.Get(O, Symbol.isConcatSpreadable);
          if (typeof spreadable !== "undefined") {
            return this.ToBoolean(spreadable);
          }
        }
        return this.IsArray(O);
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-invoke
      Invoke: function Invoke(O, P) {
        if (!this.IsPropertyKey(P)) {
          throw new $TypeError("P must be a Property Key");
        }
        var argumentsList = arraySlice(arguments, 2);
        var func = this.GetV(O, P);
        return this.Call(func, O, argumentsList);
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-getiterator
      GetIterator: function GetIterator(obj, method) {
        if (!hasSymbols) {
          throw new SyntaxError("ES.GetIterator depends on native iterator support.");
        }
        var actualMethod = method;
        if (arguments.length < 2) {
          actualMethod = this.GetMethod(obj, $Symbol.iterator);
        }
        var iterator = this.Call(actualMethod, obj);
        if (this.Type(iterator) !== "Object") {
          throw new $TypeError("iterator must return an object");
        }
        return iterator;
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-iteratornext
      IteratorNext: function IteratorNext(iterator, value) {
        var result = this.Invoke(iterator, "next", arguments.length < 2 ? [] : [value]);
        if (this.Type(result) !== "Object") {
          throw new $TypeError("iterator next must return an object");
        }
        return result;
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-iteratorcomplete
      IteratorComplete: function IteratorComplete(iterResult) {
        if (this.Type(iterResult) !== "Object") {
          throw new $TypeError("Assertion failed: Type(iterResult) is not Object");
        }
        return this.ToBoolean(this.Get(iterResult, "done"));
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-iteratorvalue
      IteratorValue: function IteratorValue(iterResult) {
        if (this.Type(iterResult) !== "Object") {
          throw new $TypeError("Assertion failed: Type(iterResult) is not Object");
        }
        return this.Get(iterResult, "value");
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-iteratorstep
      IteratorStep: function IteratorStep(iterator) {
        var result = this.IteratorNext(iterator);
        var done = this.IteratorComplete(result);
        return done === true ? false : result;
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-iteratorclose
      IteratorClose: function IteratorClose(iterator, completion) {
        if (this.Type(iterator) !== "Object") {
          throw new $TypeError("Assertion failed: Type(iterator) is not Object");
        }
        if (!this.IsCallable(completion)) {
          throw new $TypeError("Assertion failed: completion is not a thunk for a Completion Record");
        }
        var completionThunk = completion;
        var iteratorReturn = this.GetMethod(iterator, "return");
        if (typeof iteratorReturn === "undefined") {
          return completionThunk();
        }
        var completionRecord;
        try {
          var innerResult = this.Call(iteratorReturn, iterator, []);
        } catch (e) {
          completionRecord = completionThunk();
          completionThunk = null;
          throw e;
        }
        completionRecord = completionThunk();
        completionThunk = null;
        if (this.Type(innerResult) !== "Object") {
          throw new $TypeError("iterator .return must return an object");
        }
        return completionRecord;
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-createiterresultobject
      CreateIterResultObject: function CreateIterResultObject(value, done) {
        if (this.Type(done) !== "Boolean") {
          throw new $TypeError("Assertion failed: Type(done) is not Boolean");
        }
        return {
          value,
          done
        };
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-regexpexec
      RegExpExec: function RegExpExec(R, S) {
        if (this.Type(R) !== "Object") {
          throw new $TypeError("R must be an Object");
        }
        if (this.Type(S) !== "String") {
          throw new $TypeError("S must be a String");
        }
        var exec2 = this.Get(R, "exec");
        if (this.IsCallable(exec2)) {
          var result = this.Call(exec2, R, [S]);
          if (result === null || this.Type(result) === "Object") {
            return result;
          }
          throw new $TypeError('"exec" method must return `null` or an Object');
        }
        return regexExec(R, S);
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-arrayspeciescreate
      ArraySpeciesCreate: function ArraySpeciesCreate(originalArray, length) {
        if (!this.IsInteger(length) || length < 0) {
          throw new $TypeError("Assertion failed: length must be an integer >= 0");
        }
        var len = length === 0 ? 0 : length;
        var C;
        var isArray = this.IsArray(originalArray);
        if (isArray) {
          C = this.Get(originalArray, "constructor");
          if (this.Type(C) === "Object" && hasSymbols && $Symbol.species) {
            C = this.Get(C, $Symbol.species);
            if (C === null) {
              C = void 0;
            }
          }
        }
        if (typeof C === "undefined") {
          return $Array(len);
        }
        if (!this.IsConstructor(C)) {
          throw new $TypeError("C must be a constructor");
        }
        return new C(len);
      },
      CreateDataProperty: function CreateDataProperty(O, P, V) {
        if (this.Type(O) !== "Object") {
          throw new $TypeError("Assertion failed: Type(O) is not Object");
        }
        if (!this.IsPropertyKey(P)) {
          throw new $TypeError("Assertion failed: IsPropertyKey(P) is not true");
        }
        var oldDesc = $gOPD(O, P);
        var extensible = oldDesc || (typeof $isExtensible !== "function" || $isExtensible(O));
        var immutable = oldDesc && (!oldDesc.writable || !oldDesc.configurable);
        if (immutable || !extensible) {
          return false;
        }
        var newDesc = {
          configurable: true,
          enumerable: true,
          value: V,
          writable: true
        };
        Object.defineProperty(O, P, newDesc);
        return true;
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-createdatapropertyorthrow
      CreateDataPropertyOrThrow: function CreateDataPropertyOrThrow(O, P, V) {
        if (this.Type(O) !== "Object") {
          throw new $TypeError("Assertion failed: Type(O) is not Object");
        }
        if (!this.IsPropertyKey(P)) {
          throw new $TypeError("Assertion failed: IsPropertyKey(P) is not true");
        }
        var success = this.CreateDataProperty(O, P, V);
        if (!success) {
          throw new $TypeError("unable to create data property");
        }
        return success;
      },
      // https://www.ecma-international.org/ecma-262/6.0/#sec-objectcreate
      ObjectCreate: function ObjectCreate(proto, internalSlotsList) {
        if (proto !== null && this.Type(proto) !== "Object") {
          throw new $TypeError("Assertion failed: proto must be null or an object");
        }
        var slots = arguments.length < 2 ? [] : internalSlotsList;
        if (slots.length > 0) {
          throw new $SyntaxError("es-abstract does not yet support internal slots");
        }
        if (proto === null && !$ObjectCreate) {
          throw new $SyntaxError("native Object.create support is required to create null objects");
        }
        return $ObjectCreate(proto);
      },
      // https://ecma-international.org/ecma-262/6.0/#sec-advancestringindex
      AdvanceStringIndex: function AdvanceStringIndex(S, index, unicode) {
        if (this.Type(S) !== "String") {
          throw new $TypeError("S must be a String");
        }
        if (!this.IsInteger(index) || index < 0 || index > MAX_SAFE_INTEGER) {
          throw new $TypeError("Assertion failed: length must be an integer >= 0 and <= 2**53");
        }
        if (this.Type(unicode) !== "Boolean") {
          throw new $TypeError("Assertion failed: unicode must be a Boolean");
        }
        if (!unicode) {
          return index + 1;
        }
        var length = S.length;
        if (index + 1 >= length) {
          return index + 1;
        }
        var first = $charCodeAt(S, index);
        if (first < 55296 || first > 56319) {
          return index + 1;
        }
        var second = $charCodeAt(S, index + 1);
        if (second < 56320 || second > 57343) {
          return index + 1;
        }
        return index + 2;
      }
    });
    delete ES6.CheckObjectCoercible;
    module2.exports = ES6;
  }
});

// node_modules/es-abstract/es2016.js
var require_es2016 = __commonJS({
  "node_modules/es-abstract/es2016.js"(exports2, module2) {
    "use strict";
    var ES2015 = require_es20152();
    var assign = require_assign();
    var ES2016 = assign(assign({}, ES2015), {
      // https://github.com/tc39/ecma262/pull/60
      SameValueNonNumber: function SameValueNonNumber(x, y) {
        if (typeof x === "number" || typeof x !== typeof y) {
          throw new TypeError("SameValueNonNumber requires two non-number values of the same type.");
        }
        return this.SameValue(x, y);
      }
    });
    module2.exports = ES2016;
  }
});

// node_modules/es-abstract/es7.js
var require_es7 = __commonJS({
  "node_modules/es-abstract/es7.js"(exports2, module2) {
    "use strict";
    module2.exports = require_es2016();
  }
});

// node_modules/object.values/implementation.js
var require_implementation2 = __commonJS({
  "node_modules/object.values/implementation.js"(exports2, module2) {
    "use strict";
    var ES = require_es7();
    var has = require_src();
    var bind = require_function_bind();
    var isEnumerable = bind.call(Function.call, Object.prototype.propertyIsEnumerable);
    module2.exports = function values(O) {
      var obj = ES.RequireObjectCoercible(O);
      var vals = [];
      for (var key in obj) {
        if (has(obj, key) && isEnumerable(obj, key)) {
          vals.push(obj[key]);
        }
      }
      return vals;
    };
  }
});

// node_modules/object.values/polyfill.js
var require_polyfill = __commonJS({
  "node_modules/object.values/polyfill.js"(exports2, module2) {
    "use strict";
    var implementation = require_implementation2();
    module2.exports = function getPolyfill() {
      return typeof Object.values === "function" ? Object.values : implementation;
    };
  }
});

// node_modules/object.values/shim.js
var require_shim = __commonJS({
  "node_modules/object.values/shim.js"(exports2, module2) {
    "use strict";
    var getPolyfill = require_polyfill();
    var define = require_define_properties();
    module2.exports = function shimValues() {
      var polyfill = getPolyfill();
      define(Object, { values: polyfill }, {
        values: function testValues() {
          return Object.values !== polyfill;
        }
      });
      return polyfill;
    };
  }
});

// node_modules/object.values/index.js
var require_object = __commonJS({
  "node_modules/object.values/index.js"(exports2, module2) {
    "use strict";
    var define = require_define_properties();
    var implementation = require_implementation2();
    var getPolyfill = require_polyfill();
    var shim = require_shim();
    var polyfill = getPolyfill();
    define(polyfill, {
      getPolyfill,
      implementation,
      shim
    });
    module2.exports = polyfill;
  }
});

// node_modules/sentence-splitter/lib/parser/PairMaker.js
var require_PairMaker = __commonJS({
  "node_modules/sentence-splitter/lib/parser/PairMaker.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    var logger_1 = require_logger();
    var values = require_object();
    var PairMaker = (
      /** @class */
      function() {
        function PairMaker2() {
          var _a;
          this.pairs = (_a = {}, _a['"'] = '"', _a["\u300C"] = "\u300D", _a["\uFF08"] = "\uFF09", _a["("] = ")", _a["\u300E"] = "\u300F", _a["\u3010"] = "\u3011", _a);
          this.pairKeys = Object.keys(this.pairs);
          this.pairValues = values(this.pairs);
        }
        PairMaker2.prototype.mark = function(sourceCode) {
          var string = sourceCode.read();
          if (!string) {
            return;
          }
          if (!sourceCode.isInContext()) {
            var keyIndex = this.pairKeys.indexOf(string);
            if (keyIndex !== -1) {
              var key = this.pairKeys[keyIndex];
              logger_1.debugLog("PairMaker -> enterContext: " + key);
              sourceCode.enterContext(key);
            }
          } else {
            var valueIndex = this.pairValues.indexOf(string);
            if (valueIndex !== -1) {
              var key = this.pairKeys[valueIndex];
              logger_1.debugLog("PairMaker -> leaveContext: " + this.pairValues[valueIndex]);
              sourceCode.leaveContext(key);
            }
          }
        };
        return PairMaker2;
      }()
    );
    exports2.PairMaker = PairMaker;
  }
});

// node_modules/sentence-splitter/lib/sentence-splitter.js
var require_sentence_splitter = __commonJS({
  "node_modules/sentence-splitter/lib/sentence-splitter.js"(exports2) {
    "use strict";
    var __assign = exports2 && exports2.__assign || Object.assign || function(t) {
      for (var s, i = 1, n = arguments.length; i < n; i++) {
        s = arguments[i];
        for (var p in s)
          if (Object.prototype.hasOwnProperty.call(s, p))
            t[p] = s[p];
      }
      return t;
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    var ast_node_types_1 = require_lib();
    var SourceCode_1 = require_SourceCode();
    var NewLineParser_1 = require_NewLineParser();
    var SpaceParser_1 = require_SpaceParser();
    var SeparatorParser_1 = require_SeparatorParser();
    var AnyValueParser_1 = require_AnyValueParser();
    var AbbrMarker_1 = require_AbbrMarker();
    var PairMaker_1 = require_PairMaker();
    var logger_1 = require_logger();
    exports2.Syntax = {
      WhiteSpace: "WhiteSpace",
      Punctuation: "Punctuation",
      Sentence: "Sentence",
      Str: "Str"
    };
    var SplitParser = (
      /** @class */
      function() {
        function SplitParser2(text) {
          this.nodeList = [];
          this.results = [];
          this.source = new SourceCode_1.SourceCode(text);
        }
        Object.defineProperty(SplitParser2.prototype, "current", {
          get: function() {
            return this.nodeList[this.nodeList.length - 1];
          },
          enumerable: true,
          configurable: true
        });
        SplitParser2.prototype.pushNodeToCurrent = function(node) {
          var current = this.current;
          if (current) {
            current.children.push(node);
          } else {
            this.results.push(node);
          }
        };
        SplitParser2.prototype.open = function(parentNode) {
          this.nodeList.push(parentNode);
        };
        SplitParser2.prototype.isOpened = function() {
          return this.nodeList.length > 0;
        };
        SplitParser2.prototype.nextLine = function(parser) {
          var _a = this.source.seekNext(parser), value = _a.value, startPosition = _a.startPosition, endPosition = _a.endPosition;
          this.pushNodeToCurrent(createWhiteSpaceNode(value, startPosition, endPosition));
          return endPosition;
        };
        SplitParser2.prototype.nextSpace = function(parser) {
          var _a = this.source.seekNext(parser), value = _a.value, startPosition = _a.startPosition, endPosition = _a.endPosition;
          this.pushNodeToCurrent(createNode("WhiteSpace", value, startPosition, endPosition));
        };
        SplitParser2.prototype.nextValue = function(parser) {
          var _a = this.source.seekNext(parser), value = _a.value, startPosition = _a.startPosition, endPosition = _a.endPosition;
          this.pushNodeToCurrent(createTextNode(value, startPosition, endPosition));
        };
        SplitParser2.prototype.close = function(parser) {
          var _a = this.source.seekNext(parser), value = _a.value, startPosition = _a.startPosition, endPosition = _a.endPosition;
          if (startPosition.offset !== endPosition.offset) {
            this.pushNodeToCurrent(createPunctuationNode(value, startPosition, endPosition));
          }
          var currentNode = this.nodeList.pop();
          if (!currentNode) {
            return;
          }
          if (currentNode.children.length === 0) {
            return;
          }
          var firstChildNode = currentNode.children[0];
          var endNow = this.source.now();
          currentNode.loc = {
            start: firstChildNode.loc.start,
            end: nowToLoc(endNow)
          };
          var rawValue = this.source.sliceRange(firstChildNode.range[0], endNow.offset);
          currentNode.range = [firstChildNode.range[0], endNow.offset];
          currentNode.raw = rawValue;
          this.results.push(currentNode);
        };
        SplitParser2.prototype.toList = function() {
          return this.results;
        };
        return SplitParser2;
      }()
    );
    exports2.SplitParser = SplitParser;
    function split2(text) {
      var newLine = new NewLineParser_1.NewLineParser();
      var space = new SpaceParser_1.SpaceParser();
      var separator = new SeparatorParser_1.SeparatorParser();
      var abbrMarker = new AbbrMarker_1.AbbrMarker();
      var pairMaker = new PairMaker_1.PairMaker();
      var anyValueParser = new AnyValueParser_1.AnyValueParser({
        parsers: [newLine, separator],
        markers: [abbrMarker, pairMaker]
      });
      var splitParser = new SplitParser(text);
      var sourceCode = splitParser.source;
      while (!sourceCode.hasEnd) {
        if (newLine.test(sourceCode)) {
          splitParser.nextLine(newLine);
        } else if (space.test(sourceCode)) {
          splitParser.nextSpace(space);
        } else if (separator.test(sourceCode)) {
          splitParser.close(separator);
        } else {
          if (!splitParser.isOpened()) {
            splitParser.open(createEmptySentenceNode());
          }
          splitParser.nextValue(anyValueParser);
        }
      }
      splitParser.close(space);
      return splitParser.toList();
    }
    exports2.split = split2;
    function splitAST(paragraphNode) {
      var newLine = new NewLineParser_1.NewLineParser();
      var space = new SpaceParser_1.SpaceParser();
      var separator = new SeparatorParser_1.SeparatorParser();
      var abbrMarker = new AbbrMarker_1.AbbrMarker();
      var pairMaker = new PairMaker_1.PairMaker();
      var anyValue = new AnyValueParser_1.AnyValueParser({
        parsers: [newLine, separator],
        markers: [abbrMarker, pairMaker]
      });
      var splitParser = new SplitParser(paragraphNode);
      var sourceCode = splitParser.source;
      while (!sourceCode.hasEnd) {
        var currentNode = sourceCode.readNode();
        if (!currentNode) {
          break;
        }
        if (currentNode.type === ast_node_types_1.ASTNodeTypes.Str) {
          if (space.test(sourceCode)) {
            logger_1.debugLog("space");
            splitParser.nextSpace(space);
          } else if (separator.test(sourceCode)) {
            logger_1.debugLog("separator");
            splitParser.close(separator);
          } else if (newLine.test(sourceCode)) {
            logger_1.debugLog("newline");
            splitParser.nextLine(newLine);
          } else {
            if (!splitParser.isOpened()) {
              logger_1.debugLog("open -> createEmptySentenceNode()");
              splitParser.open(createEmptySentenceNode());
            }
            splitParser.nextValue(anyValue);
          }
        } else {
          if (!splitParser.isOpened()) {
            splitParser.open(createEmptySentenceNode());
          }
          splitParser.pushNodeToCurrent(currentNode);
          sourceCode.peekNode(currentNode);
        }
      }
      splitParser.close(space);
      return __assign({}, paragraphNode, { children: splitParser.toList() });
    }
    exports2.splitAST = splitAST;
    function createWhiteSpaceNode(text, startPosition, endPosition) {
      return createNode("WhiteSpace", text, startPosition, endPosition);
    }
    exports2.createWhiteSpaceNode = createWhiteSpaceNode;
    function createPunctuationNode(text, startPosition, endPosition) {
      return createNode("Punctuation", text, startPosition, endPosition);
    }
    exports2.createPunctuationNode = createPunctuationNode;
    function createTextNode(text, startPosition, endPosition) {
      return createNode("Str", text, startPosition, endPosition);
    }
    exports2.createTextNode = createTextNode;
    function createEmptySentenceNode() {
      return {
        type: "Sentence",
        raw: "",
        loc: {
          start: { column: NaN, line: NaN },
          end: { column: NaN, line: NaN }
        },
        range: [NaN, NaN],
        children: []
      };
    }
    exports2.createEmptySentenceNode = createEmptySentenceNode;
    function createNode(type, text, startPosition, endPosition) {
      return {
        type,
        raw: text,
        value: text,
        loc: {
          start: nowToLoc(startPosition),
          end: nowToLoc(endPosition)
        },
        range: [startPosition.offset, endPosition.offset]
      };
    }
    exports2.createNode = createNode;
    function nowToLoc(now) {
      return {
        line: now.line,
        column: now.column
      };
    }
  }
});

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var cp2 = __toESM(require("child_process"));
var os2 = __toESM(require("os"));

// src/SpeechEngine.ts
var say = __toESM(require_say());
var os = __toESM(require("os"));
var cp = __toESM(require("child_process"));
var import_sentence_splitter = __toESM(require_sentence_splitter());
var import_events = require("events");
var currentWindowsProcess = null;
var isStopping = false;
var SpeechEngine = class extends import_events.EventEmitter {
  constructor(text, filePath, options) {
    super();
    this.status = "stop";
    this.speechIndex = 0;
    this.txtNodes = this.parseText(text, options);
  }
  parseText(text, options) {
    let startCharIndex = 0;
    let endCharIndex = text.length;
    if (options?.range) {
      startCharIndex = options.range[0];
      endCharIndex = options.range[1];
    } else if (options?.loc) {
      let currentLine = 1;
      let index = 0;
      const lines = text.split(/\r?\n/);
      for (const line of lines) {
        if (currentLine === options.loc.start.line) {
          startCharIndex = index + options.loc.start.column;
        }
        if (options.loc.end && currentLine === options.loc.end.line) {
          endCharIndex = index + options.loc.end.column;
        }
        const isCRLF = text[index + line.length] === "\r";
        index += line.length + (isCRLF ? 2 : 1);
        currentLine++;
      }
    }
    let offset = 0;
    let textToParse = text;
    const isRangeStrict = !!(options?.range || options?.loc && options?.loc.end);
    if (isRangeStrict) {
      textToParse = text.substring(startCharIndex, endCharIndex);
      offset = startCharIndex;
    } else {
      const LARGE_FILE_THRESHOLD = 1e5;
      const PARSE_WINDOW = 5e4;
      if (text.length > LARGE_FILE_THRESHOLD) {
        const sliceStart = Math.max(0, startCharIndex - 200);
        const targetEnd = text.length;
        const sliceEnd = Math.min(text.length, Math.max(startCharIndex + PARSE_WINDOW, targetEnd));
        const MAX_SLICE_SIZE = 5e5;
        const finalSliceEnd = Math.min(sliceEnd, sliceStart + MAX_SLICE_SIZE);
        textToParse = text.substring(sliceStart, finalSliceEnd);
        offset = sliceStart;
      }
    }
    const allNodes = (0, import_sentence_splitter.split)(textToParse);
    const sentenceNodes = allNodes.filter((node) => node.type === "Sentence");
    const fineGrainedNodes = [];
    for (const node of sentenceNodes) {
      const lines = node.raw.split(/(\r?\n)/);
      let currentOffset = node.range[0];
      for (const line of lines) {
        if (line.match(/^\r?\n$/)) {
          currentOffset += line.length;
          continue;
        }
        if (line.trim().length > 0) {
          const start = currentOffset;
          const end = currentOffset + line.length;
          fineGrainedNodes.push({
            ...node,
            raw: line,
            range: [start, end]
          });
        }
        currentOffset += line.length;
      }
    }
    return fineGrainedNodes.map((node) => {
      return {
        ...node,
        range: [node.range[0] + offset, node.range[1] + offset]
      };
    }).filter((node) => {
      const [nodeStart, nodeEnd] = node.range;
      const isOverlapping = Math.max(startCharIndex, nodeStart) < Math.min(endCharIndex, nodeEnd);
      return isOverlapping && nodeEnd > startCharIndex && node.raw.trim().length > 0;
    });
  }
  onChange(handler) {
    this.on("CHANGE", handler);
  }
  start(voice, speed) {
    this.status = "play";
    isStopping = false;
    let consecutiveErrors = 0;
    const MAX_CONSECUTIVE_ERRORS = 5;
    const next = () => {
      if (this.status !== "play" || isStopping) {
        return;
      }
      if (this.speechIndex < 0 || this.speechIndex >= this.txtNodes.length) {
        this.status = "stop";
        return;
      }
      const node = this.txtNodes[this.speechIndex];
      if (!node) {
        this.status = "stop";
        return;
      }
      const text = node.raw;
      this.emit("CHANGE", node);
      speakText(text, voice, speed).then(() => {
        if (isStopping)
          return;
        consecutiveErrors = 0;
        this.speechIndex++;
        setTimeout(() => next(), 100);
      }).catch((error) => {
        if (isStopping)
          return;
        consecutiveErrors++;
        stopSpeaking();
        if (consecutiveErrors >= MAX_CONSECUTIVE_ERRORS) {
          this.status = "stop";
          this.emit("error", new Error(`Stopped due to too many consecutive errors: ${error.message || error}`));
          return;
        }
        this.emit("error", error);
        this.speechIndex++;
        setTimeout(() => next(), 200);
      });
    };
    next();
  }
  pause() {
    this.status = "pause";
    isStopping = true;
    this.removeAllListeners();
    stopSpeaking();
  }
  reset() {
    this.status = "stop";
    isStopping = true;
    this.removeAllListeners();
    stopSpeaking();
    this.speechIndex = 0;
  }
};
var stopSpeaking = () => {
  if (os.platform() === "win32") {
    if (currentWindowsProcess) {
      try {
        cp.execSync(`taskkill /F /T /PID ${currentWindowsProcess.pid}`, { stdio: "ignore" });
      } catch (e) {
      }
      currentWindowsProcess = null;
    }
  } else {
    say.stop();
  }
};
var speakText = (text, voice, speed) => {
  text = text.trim();
  if (text.length === 0 || isStopping) {
    return Promise.resolve();
  }
  if (os.platform() === "win32") {
    return new Promise((resolve, reject) => {
      const escapedText = text.replace(/'/g, "''").replace(/"/g, '`"');
      const voiceScript = voice ? `$speak.SelectVoice('${voice}');` : "";
      const rate = Math.max(-10, Math.min(10, Math.round((speed - 1) * 5)));
      const command = `Add-Type -AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; ${voiceScript} $speak.Rate = ${rate}; $speak.Speak("${escapedText}")`;
      currentWindowsProcess = cp.spawn("powershell", ["-Command", `& {${command}}`]);
      let isFinished = false;
      const cleanup = () => {
        if (isFinished)
          return;
        isFinished = true;
        if (currentWindowsProcess) {
          currentWindowsProcess.removeAllListeners();
        }
        currentWindowsProcess = null;
      };
      currentWindowsProcess.on("exit", (code) => {
        cleanup();
        resolve();
      });
      currentWindowsProcess.on("error", (err) => {
        cleanup();
        reject(err);
      });
    });
  }
  return new Promise((resolve, reject) => {
    say.speak(text, voice, speed, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve();
      }
    });
  });
};

// src/extension.ts
var sessionVoice = null;
var getVoice = () => {
  if (sessionVoice) {
    return sessionVoice;
  }
  return vscode.workspace.getConfiguration("text-speaker").get("voice") || "";
};
var getSpeed = () => vscode.workspace.getConfiguration("text-speaker").get("speed") || 1;
var highlightDecorator = null;
function updateHighlightDecorator() {
  if (highlightDecorator) {
    highlightDecorator.dispose();
  }
  const highlightColor = vscode.workspace.getConfiguration("text-speaker").get("highlightColor");
  const backgroundColor = highlightColor && highlightColor.length > 0 ? highlightColor : new vscode.ThemeColor("editor.wordHighlightStrongBackground");
  const borderColor = new vscode.ThemeColor("editor.wordHighlightStrongBorder");
  highlightDecorator = vscode.window.createTextEditorDecorationType({
    backgroundColor,
    borderColor,
    borderWidth: "1px",
    borderStyle: "solid",
    overviewRulerColor: "blue",
    overviewRulerLane: vscode.OverviewRulerLane.Right
  });
}
function highlightRange({ startIndex, endIndex }) {
  const activeEditor = vscode.window.activeTextEditor;
  if (!activeEditor) {
    return;
  }
  const startPos = activeEditor.document.positionAt(startIndex);
  const endPos = activeEditor.document.positionAt(endIndex);
  const range = new vscode.Range(startPos, endPos);
  const decoration = {
    range
  };
  if (!highlightDecorator) {
    updateHighlightDecorator();
  }
  if (highlightDecorator) {
    activeEditor.setDecorations(highlightDecorator, [decoration]);
  }
  activeEditor.revealRange(range, vscode.TextEditorRevealType.InCenterIfOutsideViewport);
}
var currentEngine = null;
var disposeFns = [];
var speech = {
  start(text, fileName, options) {
    if (currentEngine && currentEngine.status === "play") {
      this.stop();
    }
    disposeFns.push(
      vscode.workspace.onDidCloseTextDocument((event) => {
        const changedFileName = event.fileName;
        if (fileName === changedFileName) {
          this.stop();
        }
      })
    );
    disposeFns.push(
      vscode.workspace.onDidChangeTextDocument((event) => {
        const changedFileName = event.document.fileName;
        if (fileName === changedFileName) {
          this.stop();
        }
      })
    );
    currentEngine = new SpeechEngine(text, fileName, options);
    currentEngine.onChange((currentNode) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (!activeEditor) {
        return;
      }
      if (fileName !== activeEditor.document.fileName) {
        return;
      }
      highlightRange({
        startIndex: currentNode.range[0],
        endIndex: currentNode.range[1]
      });
    });
    currentEngine.on("error", (error) => {
      const message = error.message || error;
      if (message.includes("Stopped due to")) {
        vscode.window.showErrorMessage(`Text Speaker Error: ${message}`);
      } else {
        vscode.window.setStatusBarMessage(`$(error) Text Speaker: ${message}`, 3e3);
      }
    });
    currentEngine.start(getVoice(), getSpeed());
    const statusMessage = vscode.window.setStatusBarMessage("$(megaphone) Reading...");
    disposeFns.push(statusMessage);
  },
  stop() {
    if (currentEngine) {
      currentEngine.reset();
    }
    if (highlightDecorator) {
      highlightDecorator.dispose();
      highlightDecorator = null;
    }
    disposeFns.forEach((disposable) => {
      disposable.dispose();
    });
    disposeFns = [];
  }
};
var speakCurrentSelection = (editor) => {
  const selection = editor.selection;
  if (!selection)
    return;
  const startPos = editor.selection.start;
  const endPos = editor.selection.end;
  speech.start(editor.document.getText(), editor.document.fileName, {
    range: [editor.document.offsetAt(startPos), editor.document.offsetAt(endPos)],
    loc: {
      start: {
        line: startPos.line + 1,
        column: startPos.character
      },
      end: {
        line: endPos.line + 1,
        column: endPos.character
      }
    }
  });
};
var speakDocument = (editor) => {
  speech.start(editor.document.getText(), editor.document.fileName);
};
var speakHere = (editor) => {
  const active = editor.selection.active;
  speech.start(editor.document.getText(), editor.document.fileName, {
    range: [editor.document.offsetAt(active), editor.document.getText().length],
    loc: {
      start: {
        line: active.line + 1,
        column: active.character
      }
    }
  });
};
var getVoices = () => {
  return new Promise((resolve, reject) => {
    if (os2.platform() === "darwin") {
      cp2.exec("say -v ?", (err, stdout) => {
        if (err)
          return reject(err);
        const voices = stdout.split("\n").map((line) => {
          const match = line.match(/^(.+?)\s+[a-z]{2}_[A-Z]{2}/);
          return match ? match[1].trim() : null;
        }).filter((v) => v !== null);
        resolve(voices);
      });
    } else if (os2.platform() === "win32") {
      const command = `powershell -Command "& {Add-Type -AssemblyName System.speech; $speak = New-Object System.Speech.Synthesis.SpeechSynthesizer; $speak.GetInstalledVoices() | ForEach-Object { $_.VoiceInfo.Name }}"`;
      cp2.exec(command, (err, stdout) => {
        if (err)
          return reject(err);
        const voices = stdout.split("\r\n").map((v) => v.trim()).filter((v) => v.length > 0);
        resolve(voices);
      });
    } else {
      resolve([]);
    }
  });
};
var selectVoice = async () => {
  try {
    const voices = await getVoices();
    if (voices.length === 0) {
      vscode.window.showWarningMessage("No voices found or platform not supported for listing voices.");
      return;
    }
    const currentVoice = getVoice();
    const selected = await vscode.window.showQuickPick(voices, {
      placeHolder: "Select a voice for reading text"
    });
    if (selected) {
      sessionVoice = selected;
      try {
        await vscode.workspace.getConfiguration("text-speaker").update("voice", selected, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage(`Voice set to: ${selected}`);
      } catch (error) {
        console.warn("Failed to save to Global, trying implicit target", error);
        try {
          await vscode.workspace.getConfiguration("text-speaker").update("voice", selected);
          vscode.window.showInformationMessage(`Voice set to: ${selected}`);
        } catch (error2) {
          vscode.window.showInformationMessage(`Voice selected (session only): ${selected}`);
        }
      }
    }
  } catch (error) {
    vscode.window.showErrorMessage(`Failed to list voices: ${error.message}`);
  }
};
function activate(context) {
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("text-speaker.speakDocument", (editor) => {
      speech.stop();
      if (!editor)
        return;
      speakDocument(editor);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("text-speaker.speakHere", (editor) => {
      speech.stop();
      if (!editor)
        return;
      speakHere(editor);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("text-speaker.speakSelection", (editor) => {
      speech.stop();
      if (!editor)
        return;
      speakCurrentSelection(editor);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("text-speaker.stopSpeaking", () => {
      speech.stop();
    })
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("text-speaker.selectVoice", () => {
      selectVoice();
    })
  );
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("text-speaker.highlightColor")) {
        updateHighlightDecorator();
      }
    })
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate
});
