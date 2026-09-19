class Marrow_ActionDrink extends ActionContinuousBase
{
	void Marrow_ActionDrink()
	{
		m_CommandUID = DayZPlayerConstants.CMD_ACTIONMOD_DRINK;
		m_Text = "Drink";
	}

	override bool ActionCondition(PlayerBase player, ActionTarget target, ItemBase item)
	{
		Marrow_Canteen canteen = Marrow_Canteen.Cast(item);
		if (!canteen || !canteen.HasASip())
			return false;
		return super.ActionCondition(player, target, item);
	}

	override bool SetupAction(PlayerBase player, ActionTarget target, ItemBase item, out ActionData action_data, Param extra_data)
	{
		return super.SetupAction(player, target, item, action_data, extra_data);
	}
};
