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

            //  routing for user detail
            //this.oRouter.getRoute("userDetail").attachPatternMatched(this._onUserDetailMatched, this);
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

        /**
         * Handle search in users table
         */
        onSearch: function (oEvent) {
            var sSearchValue = oEvent.getParameter("query").toLowerCase();
            var allUsersModel = this.getView().getModel("allUsersModel");
            var aUsers = allUsersModel.getProperty("/users");

            if (!sSearchValue) {
                allUsersModel.setProperty("/filteredUsers", aUsers);
                return;
            }

            var aFiltered = aUsers.filter(user => {
                return (
                    (user.FIRST_NAME && user.FIRST_NAME.toLowerCase().includes(sSearchValue)) ||
                    (user.LAST_NAME && user.LAST_NAME.toLowerCase().includes(sSearchValue)) ||
                    (user.EMAIL && user.EMAIL.toLowerCase().includes(sSearchValue)) ||
                    (user.LOGIN_NAME && user.LOGIN_NAME.toLowerCase().includes(sSearchValue))
                );
            });

            allUsersModel.setProperty("/filteredUsers", aFiltered);
        },

        onListItemPress: async function (oEvent) {
            try {
                const oSelectedItem = oEvent.getParameter("listItem");
                const oCtx = oSelectedItem.getBindingContext("allUsersModel");
                const userId = oCtx.getProperty("ID");

                // Simple navigation without helper
                this.oRouter.navTo("userDetail", {
                    userId: userId,
                    layout: "TwoColumnsBeginExpanded"
                });
            } catch (error) {
                console.error("Error navigating to user detail:", error);
                MessageToast.show("Error opening user details");
            }
        },

        /**
         * Handle user detail route match 
         */
        /* _onUserDetailMatched: function (oEvent) {
            var userId = oEvent.getParameter("arguments").userId;
            var layout = oEvent.getParameter("arguments").layout;

            // Get FCL if available
            var oFCL = this.byId("fcl");
            if (oFCL) {
                oFCL.setLayout(layout);
            }
        }, */

        /**
         * Create new user DD THIS
         */
        onCreate: function () {
            // Navigate to create user or open dialog
            this.oRouter.navTo("userCreate");
        }
    });
});