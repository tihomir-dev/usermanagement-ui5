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

        /**
         * Handle user detail route match
         */
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

                /* const oFCL = this._getFCL();

                if (oFCL && typeof oFCL.setLayout === 'function') {
                    oFCL.setLayout(layout);
                    console.log("Layout applied:", layout);
                } else {
                    console.warn("FlexibleColumnLayout not found or setLayout not available");
                } */

                await this._loadUserById(userId);
            } catch (error) {
                console.error("Error in route matched:", error);
                MessageToast.show("Error loading user details");
            }
        },



        /**
         * Load user data by ID from API
         */
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

                // Map API response to model
                /* userModel.setProperty("/id", userData.ID);
                userModel.setProperty("/firstName", userData.FIRST_NAME);
                userModel.setProperty("/loginName", userData.LOGIN_NAME);
                userModel.setProperty("/email", userData.EMAIL);
                userModel.setProperty("/lastName", userData.LAST_NAME);
                userModel.setProperty("/userType", userData.USER_TYPE);
                userModel.setProperty("/userStatus", userData.STATUS);
                userModel.setProperty("/validFrom", userData.VALID_FROM);
                userModel.setProperty("/validTo", userData.VALID_TO);
                userModel.setProperty("/country", userData.COUNTRY);
                userModel.setProperty("/company", userData.COMPANY);
                userModel.setProperty("/city", userData.CITY);


                userModel.setProperty("/iasLastModified", userData.IAS_LAST_MODIFIED);
                userModel.setProperty("/createdAt", userData.CREATED_AT);
                userModel.setProperty("/updatedAt", userData.UPDATED_AT);

 */
                userModel.setProperty("/currentUser", userData);

                oView.setBusy(false);
            } catch (error) {
                console.error("Couldn't retrieve user data:", error);
                MessageToast.show("Error loading user details. Please try again.");
                oView.setBusy(false);
            }
        },

        /**
         * Reset button states to initial state
         */
        _resetButtonStates: function () {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", true);
            userModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", false);
            userModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", true);
        },

        /**
         * Update button states for different layouts
         */
        _updateButtonStates: function (fullScreen, exitFullScreen, closeColumn) {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/actionButtonsInfo/midColumn/fullScreen", fullScreen);
            userModel.setProperty("/actionButtonsInfo/midColumn/exitFullScreen", exitFullScreen);
            userModel.setProperty("/actionButtonsInfo/midColumn/closeColumn", closeColumn);
        },

        /**
         * Get FCL reference from Users view
         */
        /* _getFCL: function () {
            try {
                let current = this.getView().getParent();

                // Loop up the hierarchy to find the FlexibleColumnLayout
                let level = 0;
                while (current && level < 5) {
                    console.log(`Checking level ${level}:`, current.getMetadata().getName());
                    if (current.getMetadata().getName() === 'sap.f.FlexibleColumnLayout') {
                        console.log("Found FCL at level:", level);
                        return current;
                    }
                    current = current.getParent();
                    level++;
                }

                console.error("FCL not found in hierarchy");
                return null;
            } catch (error) {
                console.error("Error getting FCL:", error);
                return null;
            }
        }, */

        /**
         * Handle full screen button press
         */
         handleFullScreen: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "MidColumnFullScreen");
                this._updateButtonStates(false, true, true);
            }
        },

        /**
         * Handle exit full screen button press
         */
        handleExitFullScreen: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "TwoColumnsBeginExpanded");
                this._updateButtonStates(true, false, true);
            }
        },

        /**
         * Handle close button press
         */
        handleClose: function () {
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "OneColumn");
                this._updateButtonStates(false, false, false);
            }

            // Navigate back to users list
            this.getOwnerComponent().getRouter().navTo("users");
        },

        /**
         * Handle edit button press - enter edit mode
         */
        handleEdit: function () {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/isEditMode", true);
        },

        /**
         * Handle cancel button press - discard changes
         */
        handleCancel: function () {
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/isEditMode", false);

            // Reload data to discard changes
            var userId = userModel.getProperty("/id");
            if (userId) {
                this._loadUserById(userId);
            }
        },

        /**
         * Handle save button press - save changes to API
         */
        handleSave: function () {
            var userModel = this.getView().getModel("userModel");
            var userData = userModel.getData();

            // Validate required fields
            if (!userData.firstName || !userData.lastName || !userData.email) {
                MessageToast.show("Please fill in all required fields");
                return;
            }

            this.getView().setBusy(true);

            // Prepare data for API (camelCase format for PATCH)
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

            // Send PATCH request to API
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