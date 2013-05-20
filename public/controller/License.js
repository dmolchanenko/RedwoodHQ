Ext.define("Redwood.controller.License", {
    extend: 'Ext.app.Controller',

    views:  ['LicenseEditor'],

    init: function () {
        this.control({
            'licenseEditor': {
                render: this.onEditorRender,
                edit: this.afterEdit,
                machineEdit: this.onEdit,
                machineDelete: this.onDelete
            },
            'licenseEditor button': {
                click: this.add
            }
        });
    }
});