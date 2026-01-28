sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/util/formatter",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
], (Controller, JSONModel, MessageToast, Formatter, MessageBox, Fragment, Filter, FilterOperator) => {
    "use strict";

    return Controller.extend("com.customer.usermanagement.usermanagement.controller.DetailUsers", {
        formatter: Formatter,

        onInit() {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var oRouter = this.getOwnerComponent().getRouter();
            var userModel = new JSONModel({
                currentUser: {},
                actionButtonsInfo: {
                    midColumn: {
                        fullScreen: true,
                        exitFullScreen: false,
                        closeColumn: true
                    }
                },
                isEditMode: false
            });

            var oOptionsModel = new JSONModel({
                statuses: [
                    { key: "ACTIVE", text: oResourceBundle.getText("activeStatus") },
                    { key: "INACTIVE", text: oResourceBundle.getText("inactiveStatus") }
                ],
                userTypes: [
                    { key: "employee", text: oResourceBundle.getText("employeeItem") },
                    { key: "customer", text: oResourceBundle.getText("customerItem") },
                    { key: "partner", text: oResourceBundle.getText("partnerItem") },
                    { key: "external", text: oResourceBundle.getText("externalEmployeeItem") },
                    { key: "onboardee", text: oResourceBundle.getText("onboardeeItem") }
                ],
                countries: [
                    { code: "BG", name: "Bulgaria" },
                    { code: "DE", name: "Germany" },
                    { code: "US", name: "United States" },
                    { code: "FR", name: "France" },
                    { code: "IT", name: "Italy" },
                    { code: "ES", name: "Spain" },
                    { code: "GB", name: "United Kingdom" }

                ]
            });

            this.getView().setModel(userModel, "userModel");
            this.getView().setModel(oOptionsModel, "options");
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
                await this._loadUserGroups(userId);
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
                userModel.setProperty("/editUser", userData);

                oView.setBusy(false);
            } catch (error) {
                console.error("Couldn't retrieve user data:", error);
                MessageToast.show("Error loading user details. Please try again.");
                oView.setBusy(false);
            }
        },

        _loadUserGroups: async function (userId) {
            var oView = this.getView();
            var userModel = this.getView().getModel("userModel");
            oView.setBusy(true);

            try {
                var response = await fetch(`/api/users/${userId}/groups`);
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                var groupData = await response.json();
                userModel.setProperty("/currentUser/groups", groupData.groups);

            } catch (error) {
                console.error("Error loading groups");
            } finally {
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
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/isEditMode", false);
            var layoutModel = this.getOwnerComponent().getModel("layout");
            if (layoutModel) {
                layoutModel.setProperty("/layout", "OneColumn");
                this._updateButtonStates(false, false, false);
            }

            this.getOwnerComponent().getRouter().navTo("users");
        },
        onBeforeNavigate: function (oEvent) {
            var userModel = this.getView().getModel("userModel");
            var isEditMode = userModel.getProperty("/isEditMode");
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();
            var oObjectPageLayout = this.getView().byId("ObjectPageLayout");

            if (!isEditMode) {
                return;
            }

            var oSection = oEvent.getParameter("section");
            oEvent.preventDefault();

            if (!this.oDialog) {
                this.oDialog = new sap.m.Dialog({
                    title: oResourceBundle.getText("unsavedChangesTitle"),
                    content: new sap.m.Text({
                        text: oResourceBundle.getText("unsavedChangesMessage")
                    }),
                    beginButton: new sap.m.Button({
                        text: oResourceBundle.getText("okButton"),
                        press: function () {
                            var currentUser = userModel.getProperty("/currentUser");
                            var editUser = JSON.parse(JSON.stringify(currentUser));
                            userModel.setProperty("/editUser", editUser);
                            this.oDialog.close();
                            userModel.setProperty("/isEditMode", false);
                            oObjectPageLayout.setSelectedSection(oSection);
                        }.bind(this)
                    }),
                    endButton: new sap.m.Button({
                        text: oResourceBundle.getText("cancel"),
                        press: function () {
                            this.oDialog.close();
                        }.bind(this)
                    })
                });
                this.getView().addDependent(this.oDialog);
            }

            this.oDialog.open();
        },

        handleEdit: function () {
            var userModel = this.getView().getModel("userModel");
            var currentUser = userModel.getProperty("/currentUser");

            var editUser = JSON.parse(JSON.stringify(currentUser));
            userModel.setProperty("/editUser", editUser);
            userModel.setProperty("/isEditMode", true);
        },


        handleCancel: function () {
            var userModel = this.getView().getModel("userModel");


            var currentUser = userModel.getProperty("/currentUser");
            var editUser = JSON.parse(JSON.stringify(currentUser));

            userModel.setProperty("/editUser", editUser);
            userModel.setProperty("/isEditMode", false);
        },

        onCountryValueHelp: function (oEvent) {
            var oView = this.getView();
            var oInput = oEvent.getSource();

            if (!this._oCountryDialog) {
                this._oCountryDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.CountriesDialog",
                    this
                );
                oView.addDependent(this._oCountryDialog);
            }

            this._oInput = oInput;
            this._oCountryDialog.open();
        },

        onCountrySearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        onCountryValueHelpClose: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");

            if (oSelectedItem) {
                var oCtx = oSelectedItem.getBindingContext("options");
                var selectedCountry = oCtx.getObject();

                this._oInput.setValue(selectedCountry.code);

                var userModel = this.getView().getModel("userModel");
                userModel.setProperty("/editUser/COUNTRY", selectedCountry.code);  
            }

            this._oCountryDialog.close();
        },
        handleSave: async function () {
            var userModel = this.getView().getModel("userModel");
            var editUser = userModel.getProperty("/editUser");  
            var oView = this.getView();
            var oResourceBundle = this.getView().getModel("i18n").getResourceBundle();

           
            if (!editUser.LAST_NAME || !editUser.EMAIL || !editUser.STATUS || !editUser.USER_TYPE) {
                MessageToast.show(oResourceBundle.getText("requiredFieldsError"));
                return;
            }

            var validFromDate = this._formatDateForSCIM(editUser.VALID_FROM);
            var validToDate = this._formatDateForSCIM(editUser.VALID_TO);

            oView.setBusy(true);

            var updateData = {
                firstName: editUser.FIRST_NAME,
                lastName: editUser.LAST_NAME,
                loginName: editUser.LOGIN_NAME,
                email: editUser.EMAIL,
                userType: editUser.USER_TYPE,
                status: editUser.STATUS,
                validFrom: validFromDate,
                validTo: validToDate,
                country: editUser.COUNTRY,
                company: editUser.COMPANY,
                city: editUser.CITY
            };

            try {
                var response = await fetch(`/api/users/${editUser.ID}`, { 
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Accept": "application/json"
                    },
                    body: JSON.stringify(updateData)
                });

                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }

                var updatedData = await response.json();

               
                userModel.setProperty("/currentUser", updatedData);

                var freshEditUser = JSON.parse(JSON.stringify(updatedData));
                userModel.setProperty("/editUser", freshEditUser);

                userModel.setProperty("/isEditMode", false);

                MessageToast.show(oResourceBundle.getText("userSavedSuccess"));
                oView.setBusy(false);
                this._reloadUsersTable();

            } catch (error) {
                console.error("Error saving user:", error);

                var errorMessage = oResourceBundle.getText("userSaveError");

                if (error.error) {
                    errorMessage = error.error;
                } else if (error.message) {
                    errorMessage = error.message;
                }

                MessageToast.show(errorMessage);
                oView.setBusy(false);
            }
        },
        _reloadUsersTable: function () {
            sap.ui.getCore().getEventBus().publish("UserChannel", "ReloadUsers");
        },
        _formatDateForSCIM: function (dateValue) {
            if (!dateValue) return null;

            try {
                var date;

                // Handle string date values
                if (typeof dateValue === 'string') {
                    date = new Date(dateValue);
                } else if (dateValue instanceof Date) {
                    date = dateValue;
                } else {
                    console.warn("Invalid date type:", typeof dateValue);
                    return null;
                }

                // Validate the date
                if (isNaN(date.getTime())) {
                    console.warn("Invalid date value:", dateValue);
                    return null;
                }

                // Use UTC methods to ensure consistent timezone
                var year = date.getUTCFullYear();
                var month = String(date.getUTCMonth() + 1).padStart(2, '0');
                var day = String(date.getUTCDate()).padStart(2, '0');
                var hours = String(date.getUTCHours()).padStart(2, '0');
                var minutes = String(date.getUTCMinutes()).padStart(2, '0');
                var seconds = String(date.getUTCSeconds()).padStart(2, '0');

                // Format: YYYY-MM-DDTHH:mm:ssZ (matches IAS response format)
                var formattedDate = year + "-" + month + "-" + day + "T" + hours + ":" + minutes + ":" + seconds + "Z";

                console.log("Formatted date:", dateValue, "=>", formattedDate);

                return formattedDate;
            } catch (error) {
                console.error("Error formatting date:", error);
                return null;
            }
        },
        onSectionChange: function () {
            var oObjectPageLayout = this.getView().byId("ObjectPageLayout");
            var selectedSection = oObjectPageLayout.getSelectedSection();
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/selectedSection", selectedSection);
        }


    });
});