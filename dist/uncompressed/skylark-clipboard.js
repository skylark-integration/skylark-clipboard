/**
 * skylark-clipboard - A version of clipboard.js that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-clipboard/
 * @license MIT
 */
(function(factory,globals) {
  var define = globals.define,
      require = globals.require,
      isAmd = (typeof define === 'function' && define.amd),
      isCmd = (!isAmd && typeof exports !== 'undefined');

  if (!isAmd && !define) {
    var map = {};
    function absolute(relative, base) {
        if (relative[0]!==".") {
          return relative;
        }
        var stack = base.split("/"),
            parts = relative.split("/");
        stack.pop(); 
        for (var i=0; i<parts.length; i++) {
            if (parts[i] == ".")
                continue;
            if (parts[i] == "..")
                stack.pop();
            else
                stack.push(parts[i]);
        }
        return stack.join("/");
    }
    define = globals.define = function(id, deps, factory) {
        if (typeof factory == 'function') {
            map[id] = {
                factory: factory,
                deps: deps.map(function(dep){
                  return absolute(dep,id);
                }),
                resolved: false,
                exports: null
            };
            require(id);
        } else {
            map[id] = {
                factory : null,
                resolved : true,
                exports : factory
            };
        }
    };
    require = globals.require = function(id) {
        if (!map.hasOwnProperty(id)) {
            throw new Error('Module ' + id + ' has not been defined');
        }
        var module = map[id];
        if (!module.resolved) {
            var args = [];

            module.deps.forEach(function(dep){
                args.push(require(dep));
            })

            module.exports = module.factory.apply(globals, args) || null;
            module.resolved = true;
        }
        return module.exports;
    };
  }
  
  if (!define) {
     throw new Error("The module utility (ex: requirejs or skylark-utils) is not loaded!");
  }

  factory(define,require);

  if (!isAmd) {
    var skylarkjs = require("skylark-langx-ns");

    if (isCmd) {
      module.exports = skylarkjs;
    } else {
      globals.skylarkjs  = skylarkjs;
    }
  }

})(function(define,require) {

define('skylark-clipboard/ClipboardAction',[
    "skylark-domx-noder"
],function(noder){


    /**
     * Inner class which performs selection from either `text` or `target`
     * properties and then executes copy or cut operations.
     */
    class ClipboardAction {
        /**
         * @param {Object} options
         */
        constructor(options) {
            this.resolveOptions(options);
            this.initSelection();
        }

        /**
         * Defines base properties passed from constructor.
         * @param {Object} options
         */
        resolveOptions(options = {}) {
            this.action    = options.action;
            this.container = options.container;
            this.emitter   = options.emitter;
            this.target    = options.target;
            this.text      = options.text;
            this.trigger   = options.trigger;

            this.selectedText = '';
        }

        /**
         * Decides which selection strategy is going to be applied based
         * on the existence of `text` and `target` properties.
         */
        initSelection() {
            if (this.text) {
                this.selectFake();
            }
            else if (this.target) {
                this.selectTarget();
            }
        }

        /**
         * Creates a fake textarea element, sets its value from `text` property,
         * and makes a selection on it.
         */
        selectFake() {
            const isRTL = document.documentElement.getAttribute('dir') == 'rtl';

            this.removeFake();

            this.fakeHandlerCallback = () => this.removeFake();
            this.fakeHandler = this.container.addEventListener('click', this.fakeHandlerCallback) || true;

            this.fakeElem = document.createElement('textarea');
            // Prevent zooming on iOS
            this.fakeElem.style.fontSize = '12pt';
            // Reset box model
            this.fakeElem.style.border = '0';
            this.fakeElem.style.padding = '0';
            this.fakeElem.style.margin = '0';
            // Move element out of screen horizontally
            this.fakeElem.style.position = 'absolute';
            this.fakeElem.style[ isRTL ? 'right' : 'left' ] = '-9999px';
            // Move element to the same position vertically
            let yPosition = window.pageYOffset || document.documentElement.scrollTop;
            this.fakeElem.style.top = `${yPosition}px`;

            this.fakeElem.setAttribute('readonly', '');
            this.fakeElem.value = this.text;

            this.container.appendChild(this.fakeElem);

            this.selectedText = noder.select(this.fakeElem);
            this.copyText();
        }

        /**
         * Only removes the fake element after another click event, that way
         * a user can hit `Ctrl+C` to copy because selection still exists.
         */
        removeFake() {
            if (this.fakeHandler) {
                this.container.removeEventListener('click', this.fakeHandlerCallback);
                this.fakeHandler = null;
                this.fakeHandlerCallback = null;
            }

            if (this.fakeElem) {
                this.container.removeChild(this.fakeElem);
                this.fakeElem = null;
            }
        }

        /**
         * Selects the content from element passed on `target` property.
         */
        selectTarget() {
            this.selectedText = noder.select(this.target);
            this.copyText();
        }

        /**
         * Executes the copy operation based on the current selection.
         */
        copyText() {
            let succeeded;

            try {
                succeeded = document.execCommand(this.action);
            }
            catch (err) {
                succeeded = false;
            }

            this.handleResult(succeeded);
        }

        /**
         * Fires an event based on the copy operation result.
         * @param {Boolean} succeeded
         */
        handleResult(succeeded) {
            this.emitter.emit(succeeded ? 'success' : 'error', {
                action: this.action,
                text: this.selectedText,
                trigger: this.trigger,
                clearSelection: this.clearSelection.bind(this)
            });
        }

        /**
         * Moves focus away from `target` and back to the trigger, removes current selection.
         */
        clearSelection() {
            if (this.trigger) {
                this.trigger.focus();
            }

            window.getSelection().removeAllRanges();
        }

        /**
         * Sets the `action` to be performed which can be either 'copy' or 'cut'.
         * @param {String} action
         */
        set action(action = 'copy') {
            this._action = action;

            if (this._action !== 'copy' && this._action !== 'cut') {
                throw new Error('Invalid "action" value, use either "copy" or "cut"');
            }
        }

        /**
         * Gets the `action` property.
         * @return {String}
         */
        get action() {
            return this._action;
        }

        /**
         * Sets the `target` property using an element
         * that will be have its content copied.
         * @param {Element} target
         */
        set target(target) {
            if (target !== undefined) {
                if (target && typeof target === 'object' && target.nodeType === 1) {
                    if (this.action === 'copy' && target.hasAttribute('disabled')) {
                        throw new Error('Invalid "target" attribute. Please use "readonly" instead of "disabled" attribute');
                    }

                    if (this.action === 'cut' && (target.hasAttribute('readonly') || target.hasAttribute('disabled'))) {
                        throw new Error('Invalid "target" attribute. You can\'t cut text from elements with "readonly" or "disabled" attributes');
                    }

                    this._target = target;
                }
                else {
                    throw new Error('Invalid "target" value, use a valid Element');
                }
            }
        }

        /**
         * Gets the `target` property.
         * @return {String|HTMLElement}
         */
        get target() {
            return this._target;
        }

        /**
         * Destroy lifecycle.
         */
        destroy() {
            this.removeFake();
        }
    }

    return ClipboardAction;
});

define('skylark-clipboard/Clipboard',[
    "skylark-langx/skylark",
    "skylark-langx/Emitter",
    "skylark-domx-eventer",
    "./ClipboardAction"
],function(skylark,Emitter,eventer,ClipboardAction){


    /**
     * Base class which takes one or more elements, adds event listeners to them,
     * and instantiates a new `ClipboardAction` on each click.
     */
    class Clipboard extends Emitter {
        /**
         * @param {String|HTMLElement|HTMLCollection|NodeList} trigger
         * @param {Object} options
         */
        constructor(trigger, options) {
            super();

            this.resolveOptions(options);
            this.listenClick(trigger);
        }

        /**
         * Defines if attributes would be resolved using internal setter functions
         * or custom functions that were passed in the constructor.
         * @param {Object} options
         */
        resolveOptions(options = {}) {
            this.action    = (typeof options.action    === 'function') ? options.action    : this.defaultAction;
            this.target    = (typeof options.target    === 'function') ? options.target    : this.defaultTarget;
            this.text      = (typeof options.text      === 'function') ? options.text      : this.defaultText;
            this.container = (typeof options.container === 'object')   ? options.container : document.body;
        }

        /**
         * Adds a click event listener to the passed trigger.
         * @param {String|HTMLElement|HTMLCollection|NodeList} trigger
         */
        listenClick(trigger) {
            var self = this,
                callback = function(e) {
                    self.onClick(e);
                };

            eventer.on(trigger, 'click', callback);

            this.listener = {
                destroy : function(){
                    eventer.off(trigger,'click',callback);
                }
            };
        }

        /**
         * Defines a new `ClipboardAction` on each click event.
         * @param {Event} e
         */
        onClick(e) {
            const trigger = e.delegateTarget || e.currentTarget;

            if (this.clipboardAction) {
                this.clipboardAction = null;
            }

            this.clipboardAction = new ClipboardAction({
                action    : this.action(trigger),
                target    : this.target(trigger),
                text      : this.text(trigger),
                container : this.container,
                trigger   : trigger,
                emitter   : this
            });
        }

        /**
         * Default `action` lookup function.
         * @param {Element} trigger
         */
        defaultAction(trigger) {
            return getAttributeValue('action', trigger);
        }

        /**
         * Default `target` lookup function.
         * @param {Element} trigger
         */
        defaultTarget(trigger) {
            const selector = getAttributeValue('target', trigger);

            if (selector) {
                return document.querySelector(selector);
            }
        }

        /**
         * Returns the support of the given action, or all actions if no action is
         * given.
         * @param {String} [action]
         */
        static isSupported(action = ['copy', 'cut']) {
            const actions = (typeof action === 'string') ? [action] : action;
            let support = !!document.queryCommandSupported;

            actions.forEach((action) => {
                support = support && !!document.queryCommandSupported(action);
            });

            return support;
        }

        /**
         * Default `text` lookup function.
         * @param {Element} trigger
         */
        defaultText(trigger) {
            return getAttributeValue('text', trigger);
        }

        /**
         * Destroy lifecycle.
         */
        destroy() {
            this.listener.destroy();

            if (this.clipboardAction) {
                this.clipboardAction.destroy();
                this.clipboardAction = null;
            }
        }
    }


    /**
     * Helper function to retrieve attribute value.
     * @param {String} suffix
     * @param {Element} element
     */
    function getAttributeValue(suffix, element) {
        const attribute = `data-clipboard-${suffix}`;

        if (!element.hasAttribute(attribute)) {
            return;
        }

        return element.getAttribute(attribute);
    }

    return skylark.attach("intg.Clipboard",Clipboard);


});


define('skylark-clipboard/main',[
	"./Clipboard"
],function(Clipboard){
	return Clipboard;
});
define('skylark-clipboard', ['skylark-clipboard/main'], function (main) { return main; });


},this);
//# sourceMappingURL=sourcemaps/skylark-clipboard.js.map
