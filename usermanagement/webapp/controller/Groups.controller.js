sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/service/UserService"
], (Controller, JSONModel, MessageToast, UserService) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.Groups", {
        onInit() {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            this.oRouter = this.getOwnerComponent().getRouter();
            var groupsModel = new JSONModel({
                groups: [],
                total: 0
            });
            this.getView().setModel(groupsModel, "groupsModel");
            this.loadAllGroups();
            sap.ui.getCore().getEventBus().subscribe("GroupChannel", "ReloadGroups", () => {
                this.loadAllGroups("");
            }, this);
        },
        loadAllGroups: async function (queryString) {
            queryString = queryString || "";
            try {
                var groupsModel = this.getView().getModel("groupsModel");
                var oView = this.getView();
                oView.setBusy(true);
                var response = await fetch(`/api/groups${queryString}`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const dbResponse = await response.json();
                groupsModel.setProperty("/groups", dbResponse.Resources);
                groupsModel.setProperty("/total", dbResponse.totalResults);
                oView.setBusy(false);

            } catch (error) {
                console.error("Couldn't retrieve users:", error);
                MessageToast.show("Error loading users");
                this.getView().setBusy(false);
            }
        },
        onListItemPress: async function (oEvent) {
            try {
                const oSelectedItem = oEvent.getParameter("listItem");
                const oCtx = oSelectedItem.getBindingContext("groupsModel");
                const groupId = oCtx.getProperty("ID");


                this.oRouter.navTo("groupDetail", {
                    groupId: groupId,
                    layout: "TwoColumnsBeginExpanded"
                });
            } catch (error) {
                console.error("Error navigating to user detail:", error);
                MessageToast.show("Error opening user details");
            }
        },





    });
});