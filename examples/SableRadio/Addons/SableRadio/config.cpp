class CfgPatches
{
	class SableRadio
	{
		units[] = {};
		weapons[] = {};
		requiredVersion = 0.1;
		requiredAddons[] = {"DZ_Data", "DZ_Scripts"};
	};
};

class CfgMods
{
	class SableRadio
	{
		dir = "SableRadio";
		name = "Sable Radio";
		author = "Sable";
		type = "mod";
		dependencies[] = {"Game", "World", "Mission"};
		class defs
		{
			class gameScriptModule
			{
				value = "";
				files[] = {"SableRadio/scripts/3_Game"};
			};
			class worldScriptModule
			{
				value = "";
				files[] = {"SableRadio/scripts/4_World"};
			};
			class missionScriptModule
			{
				value = "";
				files[] = {"SableRadio/scripts/5_Mission"};
			};
		};
	};
};
