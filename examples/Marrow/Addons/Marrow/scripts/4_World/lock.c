class Marrow_Padlock extends CombinationLock
{
	protected int m_Tries;

	override void SetCombination(int pin)
	{
		m_Tries = 0;
		super.SetCombination(pin);
	}

	override void DialNextNumber()
	{
		m_Tries++;
		super.DialNextNumber();
	}

	override void SetNextDial()
	{
		super.SetNextDial();
	}

	override void CheckLockedStateServer()
	{
		super.CheckLockedStateServer();
	}

	override void UnlockServer(EntityAI player, EntityAI parent)
	{
		if (m_Tries > 8)
			return;
		super.UnlockServer(player, parent);
	}

	int Tries()
	{
		return m_Tries;
	}
};
