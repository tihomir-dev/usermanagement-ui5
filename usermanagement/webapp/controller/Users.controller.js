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
                total: 0,
                count: 0,
                active: 0, 
                inactive:0
            });

            this.getView().setModel(allUsersModel, "allUsersModel");
            this.loadAllUsers();
        }, 

        loadAllUsers: async function(){
            try{
                var allUsersModel = this.getView().getModel("allUsersModel");
                var response = await fetch('/api/users');

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const dbResponse = await response.json();

                var activeResponse = await fetch('/api/users?status=ACTIVE&startIndex=1&count=1');
                var activeData = await activeResponse.json();
                var activeCount = activeData.total; 

                var inactiveResponse = await fetch('/api/users?status=INACTIVE&startIndex=1&count=1');
                var inactiveData = await inactiveResponse.json();
                var inactiveCount = inactiveData.total;

                allUsersModel.setProperty("/users", dbResponse.items);
                allUsersModel.setProperty("/total", dbResponse.total);
                allUsersModel.setProperty("/count", dbResponse.count);
                allUsersModel.setProperty("/active", activeCount);
                allUsersModel.setProperty("/inactive", inactiveCount);



            }catch (error){
                console.error("Couldnt retrieve users");
            }
        },
        onListItemPress: async function (oEvent) {
    const oSelectedItem = oEvent.getParameter("listItem");
    const oCtx = oSelectedItem.getBindingContext("allUsersModel");
    const userId = oCtx.getProperty("ID");

    // Get layout helper
    const oOwnerComponent = this.getOwnerComponent();
    const oFCLHelper = await oOwnerComponent.getHelper();
    const sNextLayout = oFCLHelper.getNextUIState(1).layout; // 1 = go to mid column

    // Navigate with layout
    this.oRouter.navTo("userDetail", {
    userId: userId,
    layout: sNextLayout
});
}



        


        
    });
});