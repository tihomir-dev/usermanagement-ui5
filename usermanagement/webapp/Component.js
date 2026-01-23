sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/f/library",
    "sap/f/FlexibleColumnLayoutSemanticHelper",
    "com/customer/usermanagement/usermanagement/model/models"
], (UIComponent, JSONModel, library, FlexibleColumnLayoutSemanticHelper, models) => {
    "use strict";

    var LayoutType = library.LayoutType;

    return UIComponent.extend("com.customer.usermanagement.usermanagement.Component", {
        metadata: {
            manifest: "json",
            interfaces: [
                "sap.ui.core.IAsyncContentCreation"
            ]
        },

        init() {
    // call the base component's init function
    UIComponent.prototype.init.apply(this, arguments);

    // set the device model
    this.setModel(models.createDeviceModel(), "device");

    // set the layout model as the default unnamed model
    var oLayoutModel = new JSONModel({ layout: LayoutType.OneColumn });
    this.setModel(oLayoutModel); // no name -> default model

    // enable routing and hook into layout update
    this.getRouter().attachBeforeRouteMatched(this.onBeforeRouteMatched, this);
    this.getRouter().initialize();
},


        onBeforeRouteMatched: function(oEvent) {
            var sLayout = oEvent.getParameters().arguments.layout;
            if (!sLayout) {
                sLayout = LayoutType.OneColumn;
            }
            this.getModel().setProperty("/layout", sLayout);
        },

        getHelper: function() {
    var oFCL = this.getRootControl().byId("fcl");
    
    // If not found in root, search in the current view
    if (!oFCL) {
        var oCurrentView = this.getRootControl();
        if (oCurrentView && oCurrentView.byId) {
            oFCL = oCurrentView.byId("fcl");
        }
    }
    
    var oSettings = {
        defaultTwoColumnLayoutType: library.LayoutType.TwoColumnsMidExpanded,
        defaultThreeColumnLayoutType: library.LayoutType.ThreeColumnsMidExpanded
    };
    return FlexibleColumnLayoutSemanticHelper.getInstanceFor(oFCL, oSettings);
}
    });
});