<script type="text/javascript">
{literal}
$(document).ready(function(){
$('.paylater-gateway-contact').prepend('<label>Invoice Reference</label><input name="ref" value="{/literal}{$smarty.request.ref}{literal}"/><label>Xero customer ID</label><select name="contactid"><option value="154c7966-db56-492c-8593-8dbff98f818b">Steve Test Co</option><option value="3006ef66-56be-4773-b010-08353f995fac">Fareham Borough Council</option><option value="872d4a37-4e82-48eb-88b5-1b0340a4160a">Gosport Borough Council</option><option value="1fc024e2-19ca-4afc-93e2-c17e1ae2e2f5">Eastleigh Borough Council</option></select>');

});
{/literal}
</script>

