class RC_Survivor extends PlayerBase
{
	override void OnJumpStart()
	{
		super.OnJumpStart();
	}
};

class RC_Scout extends RC_Survivor
{
	override bool CanBeRestrained()
	{
		return true;
	}
};
