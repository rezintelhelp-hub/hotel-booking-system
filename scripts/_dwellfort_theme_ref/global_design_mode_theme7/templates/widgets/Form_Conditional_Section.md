This widget can be used to setup conditional rules for showing form fields according to the values entered or chosen for other Form Fields. It requires the Advanced Form to be used. 

You use one instance of this widget for each Form Field or collection of Form Fields that you want to have conditional visiblity. Use Groups to be able to insert Form Conditional Widgets inside the editable zone of your Advanced Form and then place the Form Fields inside the editable zone of this widget. 

This widget uses JSON code to specify the rules for the conditional checks so it is an advanced tool and should only be used by users with familiarity with JSON. When building the JSON for the rules you'll need to reference the ID of the field you want to create the rule for. When editing a page you will see the ID of each field displayed in an orange badge so it's easy to establish the ID of a given field. These badges don't show to visitors. Supported operator values in the JSON code are: `!=`, `==`, `>`, `<`

The logic can be set either to match *any* of the rules or *all* of the rules. 
