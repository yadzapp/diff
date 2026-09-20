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
		picture = "";
		action = "";
		hideName = 0;
		hidePicture = 1;
		name = "Sable Radio";
		credits = "Sable";
		author = "Sable";
		authorID = "76561198044112031";
		version = "1.4.2";
		extra = 0;
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
