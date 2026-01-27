sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/util/formatter"
], (Controller, JSONModel, MessageToast, Formatter) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.DetailUsers", {
        formatter: Formatter,

        onInit() {
            var oRouter = this.getOwnerComponent().getRouter();
            var userModel = new JSONModel({
                id: "",
                firstName: "",
                loginName: "",
                email: "",
                lastName: "",
                userType: "",
                userStatus: "",
                validFrom: "",
                validTo: "",
                country: "",
                company: "",
                city: "",
                displayName: "",
                iasLastModified: "",
                createdAt: "",
                updatedAt: "",
                actionButtonsInfo: {
                    midColumn: {
                        fullScreen: true,
                        exitFullScreen: false,
                        closeColumn: true
                    }
                },
                isEditMode: false
            });

            this.getView().setModel(userModel, "userModel");
            oRouter.getRoute("userDetail").attachPatternMatched(this._onRouteMatched, this);
        },


        _onRouteMatched: async function (oEvent) {
            try {
                const layout = oEvent.getParameter("arguments").layout;
                const userId = oEvent.getParameter("arguments").userId;

                console.log("Route matched. Layout:", layout, "UserId:", userId);
                this._resetButtonStates();

                var layoutModel = this.getOwnerComponent().getModel("layout");
                if (layoutModel) {
                    layoutModel.setProperty("/layout", layout);
                    console.log("Layout applied:", layout);
                }

                await this._loadUserById(userId);
            } catch (error) {
                console.error("Error in route matched:", error);
                MessageToast.show("Error loading user details");
            }
        },


        _loadUserById: async function (userId) {
            var oView = this.getView();
            var userModel = this.getView().getModel("userModel");
            oView.setBusy(true);

            try {
                var response = await fetch(`/api/users/${userId}`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                var userData = await response.json();

                userModel.setProperty("/currentUser", userData);

                oView.setBusy(false);
            } catch (error) {
                console.error("Couldn't retrieve user data:", error);
                MessageToast.show("Error loading user details. Please try again.");
                oView.setBusy(false);
            }
        },

        _resetButtonStates: function () {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", true);
            userModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", false);
            userModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", true);
        },

        _updateButtonStates: function (fullScreen, exitFullScreen, closeColumn) {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", fullScreen);
            userModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", exitFullScreen);
            userModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", closeColumn);
        },

        handleFullScreen: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "MidColumnFullScreen");
                this._updateButtonStates(false, true, true);
            }
        },

        handleExitFullScreen: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "TwoColumnsBeginExpanded");
                this._updateButtonStates(true, false, true);
            }
        },

        handleClose: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "OneColumn");
                this._updateButtonStates(false, false, false);
            }

            this.getOwnerComponent().getRouter().navTo("users");
        },

        handleEdit: function () {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/isEditMode", true);
        },


        handleCancel: function () {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/isEditMode", false);

            // Reload data to discard changes
            var userId = userModel.getProperty("/id");
            if (userId) {
                this._loadUserById(userId);
            }
        },

        handleSave: function () {
            var userModel = this.getView().getModel("userModel");
            var userData = userModel.getData();


            if (!userData.firstName || !userData.lastName || !userData.email) {
                MessageToast.show("Please fill in all required fields");
                return;
            }

            this.getView().setBusy(true);


            var updateData = {
                firstName: userData.firstName,
                lastName: userData.lastName,
                loginName: userData.loginName,
                email: userData.email,
                userType: userData.userType,
                userStatus: userData.userStatus,
                validFrom: userData.validFrom,
                validTo: userData.validTo,
                country: userData.country,
                company: userData.company,
                city: userData.city,
                telephone: userData.telephone,
                mobilePhone: userData.mobilePhone,
                fax: userData.fax,
                language: userData.language,
                timeZone: userData.timeZone,
                displayName: userData.displayName
            };

            fetch(`/api/users/${userData.id}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer "
                },
                body: JSON.stringify(updateData)
            })
                .then(response => {
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    return response.json();
                })
                .then(() => {
                    MessageToast.show("User details saved successfully");
                    userModel.setProperty("/isEditMode", false);
                    this.getView().setBusy(false);
                })
                .catch(error => {
                    console.error("Couldn't save user data:", error);
                    MessageToast.show("Failed to save user details. Please try again.");
                    this.getView().setBusy(false);
                });
        }
    });
});