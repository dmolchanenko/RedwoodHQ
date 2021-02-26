//====================
//   ComboView
//====================
 Ext.define('Ext.ux.ComboView',
    {extend : 'Ext.view.View', 
         alias : 'widget.comboview', 
    /**
     * @maxLength
     * maximum length for viewItems. If text is longer, it gets 'ellipsisied'.  
     */
    maxLength: 18,
    /**
     * @removeOnDblClick
     * true to unselect viewItem on double click  
     */
    removeOnDblClick: true,
    itemSelector: 'li.x-boxselect-item',
    overItemCls: 'selected',

    initComponent: function () {
        var me = this,
            field = me.field;
        me.closeCls = 'x-boxselect-item-close';
        if (!me.tpl) {
            var displayField = field.displayField,
                descField = field.descField;
            me.tpl = new Ext.XTemplate(
                '<ul class="x-boxselect-list {fieldCls} {typeCls}">',
                    '{[this.empty(values)]}',
                    '<tpl for=".">',
                        //'<li class="x-boxselect-item"', descField ? ('data-qtitle="{' + displayField + '}" data-qtip="{' + descField + '}">') : '>',
                        '<li class="x-boxselect-item"', descField ? ('data-qtip="{' + descField + '}">') : '>',
                        '<div class="x-boxselect-item-text">{[this.ellipsis(values.', displayField, ')]}</div>',
                        '<div class="x-tab-close-btn ', me.closeCls, '"></div>',
                    '</li>', 
                '</tpl>', 
                '<li class="x-boxselect-input"><input style="width:'+( (field.createNewOnEnter && !field.forceSelection) ? 35 : 2) +'px;"/><li>', // need this to manage focus; widh of input is larger in createNewOnEnter is set to true
            '</ul>', {
                compiled: true,
                disableFormats: true,
                length: me.maxLength,
                ellipsis: function (txt) {
                    return Ext.String.ellipsis(txt, this.length)
                },
                emptyText: me.emptyText,
                empty : function(values) {
                    return values.length ?  '' : ('<span style="color: gray;">' + this.emptyText + '</span>') 
                }
            })
        }
        delete me.emptyText;
        me.callParent(arguments)
    },
    renderSelectors: {
        inputEl: 'input'
    },
    getFocusEl: function () {
        return this.inputEl
    },
    addFocusListener: function (force) {
        var me = this;
        if (!me.focusListenerAdded || force) {
            me.callParent(arguments);
            var focusEl = me.getFocusEl();
            if (focusEl) {
                focusEl.on({
                    focus: me.field.onFocus,
                    blur: me.field.onBlur,
                    scope: me.field
                });
                me.getEl().on({
                    focus: me.field.onFocus,
                    scope: me.field
                })
            }
        }		
    },
    onItemClick: function (r, h, i, e, o) {
        if (e.getTarget('.' + this.closeCls)) {
            return this.onDataChange(r, 'remove')
        }
        this.highlightItem(h)
    },
    onItemDblClick: function (r, h, i, e, o) {
        if (this.removeOnDblClick) {
            this.onDataChange(r, 'remove')
        }
    },
    onDataChange: function (r, action) {
        var me = this;
        if(me.field.readOnly != true) {
            if (action == 'remove') {
                me.store.remove(r)
            }
            me.field.setStoreValues()
        }
    },
    listeners: {
        refresh: {
            fn: function () {
                this.applyRenderSelectors();
                this.addFocusListener(true);
            }
        }
    },
    onDestroy: function () {
        var me = this,
            focusEl;
        if (focusEl = me.getFocusEl()) {
            focusEl.clearListeners()
        }
    }
/*::::*/
});


