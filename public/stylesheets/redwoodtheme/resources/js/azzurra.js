

    Ext.define('Ext.window.WindowActiveCls', {
        override: 'Ext.window.Window',

        shadow: false,
        ui: 'blue-window-active',
        border:false,
        setActive: function (active, newActive) {
            var me = this;

            if (!me.el)
                return;

            if (active) {
                if (me.el.shadow && !me.maximized) {
                    me.el.enableShadow(true);
                }
                if (me.modal && !me.preventFocusOnActivate) {
                    me.focus(false, true);
                }
                me.addCls('x-window-active');
                me.fireEvent('activate', me);
            } else {

                if (me.isWindow && (newActive && newActive.isWindow)) {
                    me.el.disableShadow();
                }

                if (!newActive || newActive.isWindow)
                    me.removeCls('x-window-active');

                me.fireEvent('deactivate', me);
            }
        }
    });

    Ext.define('Ext.ZIndexFix', {

        override: 'Ext.ZIndexManager',

        _activateLast: function () {
            var me = this,
        stack = me.zIndexStack,
        i = stack.length - 1,
        oldFront = me.front,
        comp;

            for (; i >= 0 && stack[i].hidden; --i);
            if ((comp = stack[i])) {
                me._setActiveChild(comp, oldFront);
                if (comp.modal) {
                    return;
                }
            }
            for (; i >= 0; --i) {
                comp = stack[i];
                if (comp.isVisible() && comp.modal) {
                    me._showModalMask(comp);
                    return;
                }
            }
            me._hideModalMask();
        }
    });



