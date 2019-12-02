/**
 * skylark-clipboard - A version of clipboard.js that ported to running on skylarkjs.
 * @author Hudaokeji, Inc.
 * @version v0.9.0
 * @link https://github.com/skylark-integration/skylark-clipboard/
 * @license MIT
 */
define(["skylark-langx/skylark","skylark-langx/Emitter","skylark-domx-eventer","./ClipboardAction"],function(t,e,i,n){function o(t,e){const i=`data-clipboard-${t}`;if(e.hasAttribute(i))return e.getAttribute(i)}return t.attach("intg.Clipboard",class extends e{constructor(t,e){super(),this.resolveOptions(e),this.listenClick(t)}resolveOptions(t={}){this.action="function"==typeof t.action?t.action:this.defaultAction,this.target="function"==typeof t.target?t.target:this.defaultTarget,this.text="function"==typeof t.text?t.text:this.defaultText,this.container="object"==typeof t.container?t.container:document.body}listenClick(t){var e=this,n=function(t){e.onClick(t)};i.on(t,"click",n),this.listener={destroy:function(){i.off(t,"click",n)}}}onClick(t){const e=t.delegateTarget||t.currentTarget;this.clipboardAction&&(this.clipboardAction=null),this.clipboardAction=new n({action:this.action(e),target:this.target(e),text:this.text(e),container:this.container,trigger:e,emitter:this})}defaultAction(t){return o("action",t)}defaultTarget(t){const e=o("target",t);if(e)return document.querySelector(e)}static isSupported(t=["copy","cut"]){const e="string"==typeof t?[t]:t;let i=!!document.queryCommandSupported;return e.forEach(t=>{i=i&&!!document.queryCommandSupported(t)}),i}defaultText(t){return o("text",t)}destroy(){this.listener.destroy(),this.clipboardAction&&(this.clipboardAction.destroy(),this.clipboardAction=null)}})});
//# sourceMappingURL=sourcemaps/Clipboard.js.map
