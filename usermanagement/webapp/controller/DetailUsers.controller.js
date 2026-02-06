sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "com/customer/usermanagement/usermanagement/util/formatter",
    "sap/m/MessageBox",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "com/customer/usermanagement/usermanagement/util/Constants",
    "sap/ui/core/BusyIndicator"
], (Controller, JSONModel, MessageToast, Formatter, MessageBox, Fragment, Filter, FilterOperator, Constants, BusyIndicator) => {
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
                isEditMode: false,
                groupsSelected: false
            });
            var oOptionsModel = new JSONModel({
                statuses: Constants.USER_STATUSES(oResourceBundle),
                userTypes: Constants.USER_TYPES(oResourceBundle),
                countries: Constants.COUNTRIES
            });
            this.getView().setModel(userModel, "userModel");
            this.getView().setModel(oOptionsModel, "options");
            sap.ui.getCore().getEventBus().subscribe("UserChannel", "ReloadUserDetail", function (channel, event, data) {
                var userModel = this.getView().getModel("userModel");
                var currentUser = userModel.getProperty("/currentUser");
                if (currentUser && currentUser.ID) {
                    this._loadUserById(currentUser.ID);
                    this._loadUserGroups(currentUser.ID);
                }
            }.bind(this));
            oRouter.getRoute("userDetail").attachPatternMatched(this._onRouteMatched, this);
        },
        _onRouteMatched: async function (oEvent) {
            try {
                const layout = oEvent.getParameter("arguments").layout;
                const userId = oEvent.getParameter("arguments").userId;
                this._resetButtonStates();
                var layoutModel = this.getOwnerComponent().getModel("layout");
                if (layoutModel) {
                    layoutModel.setProperty("/layout", layout);
                }
                await this._loadUserById(userId);
                await this._loadUserGroups(userId);
            } catch (error) {
                var oComponent = this.getOwnerComponent();
                var oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
                MessageBox.error(oResourceBundle.getText("errorLoadingUserDetails"), {
                    title: oResourceBundle.getText("errorTitle"),
                    onClose: function (sAction) {
                        this.getOwnerComponent().getRouter().navBack();
                    }.bind(this)
                });
            }
        },
        _loadUserById: async function (userId) {
            var oView = this.getView();
            var oComponent = this.getOwnerComponent();
            var oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
            var userModel = oView.getModel("userModel");
            sap.ui.core.BusyIndicator.show(0);
            try {
                var response = await fetch(`/api/users/${userId}`);
                if (!response.ok) {
                    var sErrorMessage = oResourceBundle.getText("httpErrorMessage", [response.status]);
                    throw new Error(sErrorMessage);
                }

                var userData = await response.json();
                userModel.setProperty("/currentUser", userData);
                userModel.setProperty("/editUser", userData);
                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 500);
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("errorLoadingUserDetailsRetry"), {
                    title: oResourceBundle.getText("errorTitle"),
                    onClose: function (sAction) {
                        setTimeout(() => {
                            sap.ui.core.BusyIndicator.hide();
                        }, 500);
                    }
                });
            }
        },
        _loadUserGroups: async function (userId) {
            var oView = this.getView();
            var userModel = this.getView().getModel("userModel");
            var oComponent = this.getOwnerComponent();
            var oResourceBundle = oComponent.getModel("i18n").getResourceBundle();
            sap.ui.core.BusyIndicator.show(0);
            try {
                var response = await fetch(`/api/users/${userId}/groups`);
                if (!response.ok) {
                    var sErrorMessage = oResourceBundle.getText("httpErrorMessage", [response.status]);
                    throw new Error(sErrorMessage);
                }
                var groupData = await response.json();
                userModel.setProperty("/currentUser/groups", groupData.groups);
                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 500);
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("errorLoadingGroupsRetry"), {
                    title: oResourceBundle.getText("errorTitle"),
                    onClose: function (sAction) {
                        setTimeout(() => {
                            sap.ui.core.BusyIndicator.hide();
                        }, 500);
                    }
                });
            } finally {
                setTimeout(() => {
                    sap.ui.core.BusyIndicator.hide();
                }, 500);
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
                MessageBox.error(oResourceBundle.getText("requiredFieldsError"), {
                    title: oResourceBundle.getText("errorTitle"),
                    onClose: function (sAction) {
                    }
                });
                return;
            }
            var validFromDate = this._formatDateForSCIM(editUser.VALID_FROM);
            var validToDate = this._formatDateForSCIM(editUser.VALID_TO);
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
                this._reloadUsersTable();
            } catch (error) {
                var errorMessage = oResourceBundle.getText("userSaveError");
                if (error.error) {
                    errorMessage = error.error;
                } else if (error.message) {
                    errorMessage = error.message;
                }
                MessageBox.error(errorMessage, {
                    title: oResourceBundle.getText("errorTitle"),
                    onClose: function (sAction) {
                    }
                });
            }
        },
        _reloadUsersTable: function () {
            sap.ui.getCore().getEventBus().publish("UserChannel", "ReloadUsers");
        },
        _formatDateForSCIM: function (dateValue) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            if (!dateValue) return null;
            try {
                var date;
                // Handle string date values
                if (typeof dateValue === 'string') {
                    date = new Date(dateValue);
                } else if (dateValue instanceof Date) {
                    date = dateValue;
                } else {
                    console.warn(oResourceBundle.getText("invalidDateType"), typeof dateValue);
                    return null;
                }
                // Validate the date
                if (isNaN(date.getTime())) {
                    console.warn(oResourceBundle.getText("invalidDateValue"), dateValue);
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
                return formattedDate;
            } catch (error) {
                console.error(oResourceBundle.getText("errorFormattingDate"), error);
                return null;
            }
        },
        onSectionChange: function () {
            var oObjectPageLayout = this.getView().byId("ObjectPageLayout");
            var selectedSection = oObjectPageLayout.getSelectedSection();
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/selectedSection", selectedSection);
        },
        onAssign: function () {
            var oView = this.getView();
            var userModel = this.getView().getModel("userModel");
            var currentUserId = userModel.getProperty("/currentUser/ID");

            if (!this._oAssignGroupsDialog) {
                this._oAssignGroupsDialog = sap.ui.xmlfragment(
                    oView.getId(),
                    "com.customer.usermanagement.usermanagement.view.fragments.AssignUserToGroups",
                    this
                );
                oView.addDependent(this._oAssignGroupsDialog);
            }
            this._loadGroupsForAssignment(currentUserId);
        },
        onAssignGroupsSelectionChange: function (oEvent) {
            var oTable = oEvent.getSource();
            var bSelected = oEvent.getParameter("selected");
            var bSelectAll = oEvent.getParameter("selectAll");
            var oItem = oEvent.getParameter("listItem");
            var oModel = this.getView().getModel("assignGroupsModel");
            var assignedGroupIds = oModel.getProperty("/assignedGroupIds") || [];
            //  User clicked deselct all(header checkbox)
            if (bSelectAll === false) {
                Promise.resolve().then(() => {
                    oTable.getItems().forEach(function (item) {
                        var oCtx = item.getBindingContext("assignGroupsModel");
                        if (!oCtx) return;
                        var groupId = oCtx.getProperty("ID");
                        if (assignedGroupIds.includes(groupId)) {
                            oTable.setSelectedItem(item, true);
                        }
                    });
                });
                return;
            }
            //  User tries to deselect a single assigned group
            if (!bSelected && oItem) {
                var oCtx = oItem.getBindingContext("assignGroupsModel");
                if (!oCtx) return;
                var groupId = oCtx.getProperty("ID");
                if (assignedGroupIds.includes(groupId)) {
                    Promise.resolve().then(() => {
                        oTable.setSelectedItem(oItem, true);
                    });
                }
            }
        },
        _loadGroupsForAssignment: async function (userId) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            try {
                // Get all groups
                var allGroupsResponse = await fetch('/api/groups');
                if (!allGroupsResponse.ok) {
                    throw new Error(`HTTP ${allGroupsResponse.status}: ${allGroupsResponse.statusText}`);
                }
                var allGroupsData = await allGroupsResponse.json();
                var allGroups = allGroupsData.Resources || [];
                // Get user's current groups
                var userGroupsResponse = await fetch(`/api/users/${userId}/groups`);
                if (!userGroupsResponse.ok) {
                    throw new Error(`HTTP ${userGroupsResponse.status}: ${userGroupsResponse.statusText}`);
                }
                var userGroupsData = await userGroupsResponse.json();
                var userGroupIds = (userGroupsData.groups || []).map(g => g.ID);
                var groupsWithAssignment = allGroups.map(function (group) {
                    group.assigned = userGroupIds.indexOf(group.ID) !== -1;
                    return group;
                });
                var assignGroupsModel = new sap.ui.model.json.JSONModel({
                    groups: groupsWithAssignment,
                    userId: userId,
                    assignedGroupIds: userGroupIds
                });
                this.getView().setModel(assignGroupsModel, "assignGroupsModel");
                this._oAssignGroupsDialog.open();
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("errorLoadingGroups"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        onAssignGroupsConfirm: async function () {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var assignGroupsModel = this.getView().getModel("assignGroupsModel");
            var assignGroupsTable = this.getView().byId("assignGroupsTable");
            var selectedItems = assignGroupsTable.getSelectedItems();
            var userId = assignGroupsModel.getProperty("/userId");
            if (selectedItems.length === 0) {
                sap.m.MessageToast.show(oResourceBundle.getText("pleaseSelectGroupsToAssign"));
                return;
            }
            var selectedGroupIds = selectedItems.map(item =>
                item.getBindingContext("assignGroupsModel").getProperty("ID")
            );
            try {
                var response = await fetch(`/api/users/${userId}/groups`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ groupIds: selectedGroupIds })
                });
                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }
                var result = await response.json();
                console.log("Groups assigned:", result);
                sap.m.MessageToast.show(oResourceBundle.getText("groupsAssignedSuccess"));
                this._loadUserGroups(userId);
                this._oAssignGroupsDialog.close();
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("groupsAssignError"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        onAssignGroupsCancel: function () {
            this._oAssignGroupsDialog.close();
            this._oAssignGroupsDialog.destroy();
            this._oAssignGroupsDialog = null;
        },
        onGroupsSelectionChange: function (oEvent) {
            var oTable = oEvent.getSource();
            var aSelectedItems = oTable.getSelectedItems();
            var userModel = this.getView().getModel("userModel");
            userModel.setProperty("/groupsSelected", aSelectedItems.length > 0);
        },
        onUnassign: async function () {
            var oTable = this.getView().byId("groupsAssignmentTable");
            var selectedItems = oTable.getSelectedItems();
            var userModel = this.getView().getModel("userModel");
            var currentUser = userModel.getProperty("/currentUser");
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            if (selectedItems.length === 0) {
                sap.m.MessageToast.show("Please select groups to unassign");
                return;
            }
            var selectedGroupIds = selectedItems.map(item =>
                item.getBindingContext("userModel").getProperty("ID")
            );
            try {
                var response = await fetch(`/api/users/${currentUser.ID}/groups`, {
                    method: 'DELETE',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify({ groupIds: selectedGroupIds })
                });
                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }
                var result = await response.json();
                console.log("Groups unassigned:", result);
                sap.m.MessageToast.show(oResourceBundle.getText("groupsUnassignedSuccess"));
                this._loadUserGroups(currentUser.ID);
                oTable.removeSelections(true);
                userModel.setProperty("/groupsSelected", false);
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("groupsUnassignError"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        onDeleteUser: function () {
            var userModel = this.getView().getModel("userModel");
            var currentUser = userModel.getProperty("/currentUser");
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            sap.m.MessageBox.confirm(
                oResourceBundle.getText("deleteUserConfirmMessage"),
                {
                    title: oResourceBundle.getText("deleteUserConfirmTitle"),
                    onClose: (sAction) => {
                        if (sAction === sap.m.MessageBox.Action.OK) {
                            this._deleteUser(currentUser.ID);
                        }
                    }
                }
            );
        },
        _deleteUser: async function (userId) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            try {
                var response = await fetch(`/api/users/${userId}`, {
                    method: 'DELETE',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
                if (!response.ok) {
                    var errorData = await response.json();
                    throw errorData;
                }
                MessageToast.show(oResourceBundle.getText("userDeletedSuccess"));
                // Reload users table
                this._reloadUsersTable();
                // Close detail page
                this.handleClose();
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("userDeleteError"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        showBusyIndicator: function (iDuration, iDelay) {
            BusyIndicator.show(iDelay || 0);
            if (iDuration && iDuration > 0) {
                if (this._sBusyTimeoutId) {
                    clearTimeout(this._sBusyTimeoutId);
                    this._sBusyTimeoutId = null;
                }
                this._sBusyTimeoutId = setTimeout(function () {
                    this.hideBusyIndicator();
                }.bind(this), iDuration);
            }
        },
        hideBusyIndicator: function () {
            BusyIndicator.hide();
        }
    });
});