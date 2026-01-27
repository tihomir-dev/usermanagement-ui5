sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/service/UserService"
], (Controller, JSONModel, MessageToast, UserService) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.Users", {

        onInit() {
            var that = this;
            this.oRouter = that.getOwnerComponent().getRouter();

            var allUsersModel = new JSONModel({
                users: [],
                filteredUsers: [],
                total: 0,
                count: 0
            });

            this.getView().setModel(allUsersModel, "allUsersModel");
            this.loadAllUsers();

           
        },

        loadAllUsers: async function () {
            try {
                var allUsersModel = this.getView().getModel("allUsersModel");
                var oView = this.getView();
                oView.setBusy(true);

                var response = await fetch('/api/users');

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const dbResponse = await response.json();

                allUsersModel.setProperty("/users", dbResponse.items);
                allUsersModel.setProperty("/filteredUsers", dbResponse.items);
                allUsersModel.setProperty("/total", dbResponse.total);
                allUsersModel.setProperty("/count", dbResponse.count);


                oView.setBusy(false);
            } catch (error) {
                console.error("Couldn't retrieve users:", error);
                MessageToast.show("Error loading users");
                this.getView().setBusy(false);
            }
        },

        
        onSearch: async function (oEvent) {
            var sSearchValue = oEvent.getParameter("query").toLowerCase();
            var allUsersModel = this.getView().getModel("allUsersModel");
            var aUsers = allUsersModel.getProperty("/users");
            var oView = this.getView();

            if (!sSearchValue) {
                allUsersModel.setProperty("/filteredUsers", aUsers);
                return;
            }

            oView.setBusy(true);

            try {
                var searchData = await fetch(`/api/users?search=${encodeURIComponent(sSearchValue)}`);

                if (!searchData.ok) {
                    throw new Error(`HTTP error! status: ${searchData.status}`);
                }

                var dbSearchResponse = await searchData.json();


                allUsersModel.setProperty("/filteredUsers", dbSearchResponse.items);
            } catch (error) {
                console.error("Search error:", error);
                MessageToast.show("Error searching users");
            } finally {
                oView.setBusy(false);  
            }
        },

        onListItemPress: async function (oEvent) {
            try {
                const oSelectedItem = oEvent.getParameter("listItem");
                const oCtx = oSelectedItem.getBindingContext("allUsersModel");
                const userId = oCtx.getProperty("ID");

              
                this.oRouter.navTo("userDetail", {
                    userId: userId,
                    layout: "TwoColumnsBeginExpanded"
                });
            } catch (error) {
                console.error("Error navigating to user detail:", error);
                MessageToast.show("Error opening user details");
            }
        },

        onCreate: function () {
           
            this.oRouter.navTo("userCreate");
        }
    });
});