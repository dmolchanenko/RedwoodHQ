Ext.define('Ext.window.WindowActiveCls', {
    override: 'Ext.window.Window',

    statics: {
        _activeWindow: null
    },

    shadow: false,
    ui: 'blue-window-active',
    border: false,
    setActive: function (active, newActive) {

        var me = this;

        if (!me.el)
            return;

        if (active) {
            me.addCls('x-window-active');

            var paw = Ext.window.Window._activeWindow;
            Ext.window.Window._activeWindow = me;

            if (paw && paw != me && paw.el) {
                paw.removeCls('x-window-active');
            }
        } else {
            me.removeCls('x-window-active');
        }

        this.callParent(arguments);
    }
});
