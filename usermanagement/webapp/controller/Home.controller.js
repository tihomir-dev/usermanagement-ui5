sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/service/UserService"
], (Controller, JSONModel, MessageToast, UserService) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.Home", {

        onInit() {
            var oRouter = this.getOwnerComponent().getRouter();
            var userModel = this.getOwnerComponent().getModel("userModel");
            if (userModel) {
                userModel.setProperty("/selectedKey", null);
            }
            if (userModel) {
                userModel.setProperty("/selectedKey", null);
            }
            this._loadUsersStats();
            this._loadGroupsStats();
            sap.ui.getCore().getEventBus().subscribe("UserChannel", "ReloadUsers", function (channel, event, data) {
                this._loadUsersStats();
            }.bind(this));

            sap.ui.getCore().getEventBus().subscribe("GroupChannel", "ReloadGroups", function (channel, event, data) {
                this._loadGroupsStats();
            }.bind(this));
        },
        onUserCardReady: function (oEvent) {
            var oCard = oEvent.getSource();
            this._loadUsersStats();
        },
        onGroupCardReady: function (oEvent) {
            var oCard = oEvent.getSource();
            this._loadGroupsStats();
        },
        _loadUsersStats: async function () {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            try {
                var response = await fetch('/api/users?startIndex=1&count=1');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                var totalData = await response.json();
                var total = totalData.total;
                var oCard = this.getView().byId("userCardId");
                if (oCard) {
                    oCard.setModel(new JSONModel({
                        total: total
                    }));
                }
            } catch (error) {
                console.error("Error loading users stats:", error);
                MessageToast.show(oResourceBundle.getText("errorLoadingUsersStats"));
            }
        },
        _loadGroupsStats: async function () {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            try {
                var response = await fetch('/api/groups?startIndex=1&count=1');
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }
                var totalData = await response.json();
                var totalGroups = totalData.totalResults;
                var oCard = this.getView().byId("groupCardId");
                if (oCard) {
                    oCard.setModel(new JSONModel({
                        totalGroups: totalGroups
                    }));
                }
            } catch (error) {
                console.error("Error loading groups stats:", error);
                MessageToast.show(oResourceBundle.getText("errorLoadingGroupsStats"));
            }
        },
        onCardAction: function (oEvent) {
            const oParameters = oEvent.getParameter("parameters");
            const sAction = oParameters.action;
            // Get the App view 
            var oAppView = this.getOwnerComponent().getRootControl();
            var userModel = oAppView.getModel("userModel");
            if (userModel) {
                if (sAction === "navigateToUsers") {
                    userModel.setProperty("/selectedKey", "users");
                } else if (sAction === "navigateToGroups") {
                    userModel.setProperty("/selectedKey", "groups");
                }
            }
            if (sAction === "navigateToUsers") {
                this.getOwnerComponent().getRouter().navTo("users");
            } else if (sAction === "navigateToGroups") {
                this.getOwnerComponent().getRouter().navTo("groups");
            }
        }
    });
});