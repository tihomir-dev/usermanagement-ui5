sap.ui.define([
  "sap/ui/core/mvc/Controller"
], (BaseController) => {
  "use strict";

  return BaseController.extend("com.customer.usermanagement.usermanagement.controller.App", {
      onInit() {
        const oFCL = this.byId("fcl");
    if (oFCL) {
        oFCL.setLayout("OneColumn");
    }
      }
  });
});