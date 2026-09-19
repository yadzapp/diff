modded class PlayerBase
{
	override void OnJumpStart()
	{
		super.OnJumpStart();
	}

	// experimental is bool(ParamsReadContext, int)
	override void OnStoreLoad(ParamsReadContext ctx, int version)
	{
	}

	override void TuneRadio(int station)
	{
	}
};
