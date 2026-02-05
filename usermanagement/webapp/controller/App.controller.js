sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "com/customer/usermanagement/usermanagement/service/UserService",
    "sap/ui/core/Fragment",
    "sap/m/MessageBox",
    "sap/m/MessageToast"
], (Controller, JSONModel, UserService, Fragment, MessageBox, MessageToast) => {
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
                selectedKey: "home",
                hasNotification: false,
                notificationCount: 0,
                syncChanges: null,
                lastSyncTime: null
            });
            const layoutModel = new JSONModel({
                layout: "OneColumn"
            });
            this.getOwnerComponent().setModel(layoutModel, "layout");
            this.getView().setModel(userModel, "userModel");

            this.oRouter.attachBeforeRouteMatched(function (oEvent) {
                var sLayout = oEvent.getParameter("arguments").layout;
                if (sLayout) {
                    layoutModel.setProperty("/layout", sLayout);
                }
            });
            this.oNotificationBtn = this.byId("notificationBtn");
            this.loadCurrentUser();
            this.startSyncNotificationPolling();
        },
        loadCurrentUser: async function () {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            try {
                const userData = await UserService.getCurrentUser();
                const uModel = this.getView().getModel("userModel");
                uModel.setData(userData);
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("errorLoadingCurrentUser"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        startSyncNotificationPolling: function () {
            var self = this;
            // every 10 seconds
            this.notificationInterval = setInterval(function () {
                self.pollSyncNotification();
            }, 10000);
            //  poll immediately on app start
            this.pollSyncNotification();
        },
        pollSyncNotification: async function () {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var userModel = this.getView().getModel("userModel");
            try {
                var response = await fetch('/api/sync/notification');
                var data = await response.json();
                if (data.hasChanges) {
                    this.handleSyncChanges(data);
                } else {
                    // No changes - clear badge
                    this.updateBadge(0);
                    userModel.setProperty("/hasNotification", false);
                }
            } catch (error) {
                MessageBox.error(oResourceBundle.getText("errorPollingSyncNotification"), {
                    title: oResourceBundle.getText("errorTitle")
                });
            }
        },
        handleSyncChanges: function (response) {
            var userModel = this.getView().getModel("userModel");
            var users = response.users || {};
            var groups = response.groups || {};
            var userGroupAssignments = response.userGroupAssignments || {};
            var groupMembers = response.groupMembers || {};
            var usersChanged = users.upserted || 0;
            var groupsChanged = groups.inserted || 0;
            var userGroupAssignmentsChanged = userGroupAssignments.assignmentChanges || 0;
            var groupMembersChanged = groupMembers.membershipChanges || 0;
            var totalChanges = usersChanged + groupsChanged + userGroupAssignmentsChanged + groupMembersChanged;
            this.updateBadge(totalChanges);
            // Store detailed sync info

            userModel.setProperty("/syncChanges", {
                usersUpserted: usersChanged,
                groupsInserted: groupsChanged,
                userGroupAssignmentsChanged: userGroupAssignmentsChanged,
                groupMembersChanged: groupMembersChanged,
                totalChanges: totalChanges,
                timestamp: new Date().toLocaleTimeString(),
                usersFetched: users.fetched || 0,
                usersSkipped: users.skipped || 0,
                groupsFetched: groups.totalGroups || 0,
                groupsErrors: groups.failed || 0,
                assignmentErrors: userGroupAssignments.failed || 0,
                membershipErrors: groupMembers.failed || 0
            });
            userModel.setProperty("/hasNotification", true);
        },
        onTabSelect: function (oEvent) {
            var selectedKey = oEvent.getParameter("key");
            var userModel = this.getView().getModel("userModel");
            var layoutModel = this.getOwnerComponent().getModel("layout");

            // Close mid column
            if (layoutModel) {
                layoutModel.setProperty("/layout", "OneColumn");
            }
            userModel.setProperty("/selectedKey", selectedKey);
            if (selectedKey === "home") {
                this.oRouter.navTo("home");
            } else if (selectedKey === "users") {
                this.oRouter.navTo("users");
                sap.ui.getCore().getEventBus().publish("FiltersChannel", "ResetFilters");
            } else if (selectedKey === "groups") {
                this.oRouter.navTo("groups");
                sap.ui.getCore().getEventBus().publish("FiltersChannel", "ResetFilters");
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
        updateBadge: function (iCount) {
            if (!this.oNotificationBtn) {
                return;
            }
            if (iCount > 0) {
                this.oNotificationBtn.setText(iCount.toString());
                this.oNotificationBtn.setType("Emphasized");
            } else {
                this.oNotificationBtn.setText("");
                this.oNotificationBtn.setType("Transparent");
            }
        },
        onNotificationPress: function (oEvent) {
            var oResourceBundle = this.getOwnerComponent().getModel("i18n").getResourceBundle();
            var userModel = this.getView().getModel("userModel");
            var syncChanges = userModel.getProperty("/syncChanges");
            if (!syncChanges) {
                MessageBox.information(oResourceBundle.getText("noSyncChangesDetected"), {
                    title: oResourceBundle.getText("syncNotificationsTitle")
                });
                return;
            }
            var message = oResourceBundle.getText("lastSyncResults") + "\n\n" +
                oResourceBundle.getText("usersLabel") + ":\n" +
                "  " + oResourceBundle.getText("changed") + ": " + syncChanges.usersUpserted + "\n" +
                "  " + oResourceBundle.getText("totalFetched") + ": " + syncChanges.usersFetched + "\n" +
                "  " + oResourceBundle.getText("unchanged") + ": " + syncChanges.usersSkipped + "\n\n" +
                oResourceBundle.getText("groupsLabel") + ":\n" +
                "  " + oResourceBundle.getText("changed") + ": " + syncChanges.groupsInserted + "\n" +
                "  " + oResourceBundle.getText("totalFetched") + ": " + syncChanges.groupsFetched + "\n\n" +
                oResourceBundle.getText("userGroupAssignments") + ":\n" +
                "  " + oResourceBundle.getText("changed") + ": " + syncChanges.userGroupAssignmentsChanged + "\n" +
                "  " + oResourceBundle.getText("errors") + ": " + syncChanges.assignmentErrors + "\n\n" +
                oResourceBundle.getText("groupMembers") + ":\n" +
                "  " + oResourceBundle.getText("changed") + ": " + syncChanges.groupMembersChanged + "\n" +
                "  " + oResourceBundle.getText("errors") + ": " + syncChanges.membershipErrors + "\n\n" +
                oResourceBundle.getText("time") + ": " + syncChanges.timestamp;

            MessageBox.information(message, {
                title: oResourceBundle.getText("syncNotificationsTitle"),
                onClose: async function () {
                    try {
                        var response = await fetch('/api/sync/notification/clear', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            }
                        });
                        if (!response.ok) {
                            throw new Error(`HTTP error! status: ${response.status}`);
                        }
                        userModel.setProperty("/hasNotification", false);
                        this.updateBadge(0);
                        // publish reload events when user clicks OK
                        if (syncChanges.usersUpserted > 0) {
                            sap.ui.getCore().getEventBus().publish("UserChannel", "ReloadUsers");
                            sap.ui.getCore().getEventBus().publish("UserChannel", "ReloadUserDetail");
                            sap.ui.getCore().getEventBus().publish("HomeChannel", "ReloadUsersStats");
                        }
                        if (syncChanges.groupsInserted > 0) {
                            sap.ui.getCore().getEventBus().publish("GroupChannel", "ReloadGroups");
                            sap.ui.getCore().getEventBus().publish("GroupChannel", "ReloadGroupDetail");
                            sap.ui.getCore().getEventBus().publish("HomeChannel", "ReloadGroupsStats");
                        }
                        if (syncChanges.userGroupAssignmentsChanged > 0 || syncChanges.groupMembersChanged > 0) {
                            sap.ui.getCore().getEventBus().publish("UserChannel", "ReloadUsers");
                            sap.ui.getCore().getEventBus().publish("UserChannel", "ReloadUserDetail");
                            sap.ui.getCore().getEventBus().publish("GroupChannel", "ReloadGroups");
                            sap.ui.getCore().getEventBus().publish("GroupChannel", "ReloadGroupDetail");
                        }
                    } catch (error) {
                        MessageBox.error(oResourceBundle.getText("errorClearingNotifications"), {
                            title: oResourceBundle.getText("errorTitle")
                        });
                    }
                }.bind(this)
            });
        },
        onExit: function () {
            if (this.notificationInterval) {
                clearInterval(this.notificationInterval);
            }
        }
    });
});