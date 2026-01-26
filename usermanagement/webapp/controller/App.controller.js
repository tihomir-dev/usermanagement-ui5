sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "com/customer/usermanagement/usermanagement/service/UserService",
    "sap/ui/core/Fragment"
], (Controller, JSONModel, UserService, Fragment) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.App", {
        onInit() {
            this.oRouter = this.getOwnerComponent().getRouter();

            const userModel = new JSONModel({
                name: "",
                email: "",
                firstName: "",
                lastName: "",
                displayName: "",
                initials: "",
                selectedKey: "home"
            });

            const layoutModel = new JSONModel({
                layout: "OneColumn"
            });

            this.getOwnerComponent().setModel(layoutModel, "layout");
            this.getView().setModel(userModel, "userModel");

            this.oRouter.attachBeforeRouteMatched(function(oEvent) {
                var sLayout = oEvent.getParameter("arguments").layout;
                if (sLayout) {
                    layoutModel.setProperty("/layout", sLayout);
                }
            });
            
            this.loadCurrentUser();
        },

        loadCurrentUser: async function () {
            try {
                const userData = await UserService.getCurrentUser();
                const uModel = this.getView().getModel("userModel");
                uModel.setData(userData);
            } catch (error) {
                console.log("Error loading user:", error);
            }
        },



        onTabSelect: function (oEvent) {
            var selectedKey = oEvent.getParameter("key");
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/selectedKey", selectedKey);

            if (selectedKey === "home") {
                this.oRouter.navTo("home");
            } else if (selectedKey === "users") {
                this.oRouter.navTo("users");
            } else if (selectedKey === "groups") {
                this.oRouter.navTo("groups");
            }
        },

        onPressAvatar: function (oEvent) {
            var oButton = oEvent.getSource();
            var oView = this.getView();

            if (!this._pUserMenuPopover) {
                this._pUserMenuPopover = Fragment.load({
                    id: oView.getId(),
                    name: "com.customer.usermanagement.usermanagement.view.fragments.UserPopOver",
                    controller: this
                }).then(function (oPopover) {

                    oView.addDependent(oPopover);
                    return oPopover;
                });
            }
            this._pUserMenuPopover.then(function (oPopover) {
                oPopover.openBy(oButton);
            });
        },

        onLogout: function () {
            window.location.href = "/do/logout";
        },
    });
});