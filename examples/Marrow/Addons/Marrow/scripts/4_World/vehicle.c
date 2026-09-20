class Marrow_Wheel extends CarWheel
{
	override void OnWasAttached(EntityAI parent, int slot)
	{
		super.OnWasAttached(parent, slot);
	}

	override void OnWasDetached(EntityAI parent, int slot)
	{
		super.OnWasDetached(parent, slot);
	}
};

class Marrow_Truck extends CarScript
{
	protected bool m_Lamps;

	override void OnEngineStart()
	{
		super.OnEngineStart();
		if (m_Lamps)
			ToggleHeadlights();
	}

	override void ToggleHeadlights()
	{
		m_Lamps = !m_Lamps;
		super.ToggleHeadlights();
	}

	override void GenerateCarHornAINoise(int loudness)
	{
		super.GenerateCarHornAINoise(loudness);
	}
};
