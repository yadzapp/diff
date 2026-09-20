class Marrow_Panel extends ScriptedWidgetEventHandler
{
	protected Widget m_Root;
	protected TextWidget m_Label;

	void Marrow_Panel(Widget parent)
	{
		m_Root = parent;
		if (m_Root)
			m_Label = TextWidget.Cast(m_Root.FindAnyWidget("MarrowLabel"));
	}

	void SetCaption(string text)
	{
		if (m_Label)
			m_Label.SetText(text);
	}

	override bool OnClick(Widget w, int x, int y, int button)
	{
		if (w == m_Root)
			return true;
		return super.OnClick(w, x, y, button);
	}

	override bool OnDoubleClick(Widget w, int x, int y, int button)
	{
		SetCaption("Packed");
		return super.OnDoubleClick(w, x, y, button);
	}
};
